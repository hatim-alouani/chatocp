import got from "got";

async function chatRoutes(fastify, options) {
  fastify.post("/chat", async (req, reply) => {
    if (!req.user || !req.user.user_id) {
      return reply.code(401).send({ message: "Authentication required." });
    }

    const userId = Number(req.user.user_id);
    const { question, conversationId } = req.body;

    if (!question || !question.trim())
      return reply.code(400).send({ message: "Question is required." });

    try {
      const convId = conversationId || "default-session";

      const countRes = await fastify.db.get(
        "SELECT COUNT(*) AS count FROM messages WHERE user_id = ?",
        [userId]
      );
      const msgIndex = Number(countRes?.count || 0) + 1;

      await fastify.db.run(
        "INSERT INTO messages (conversation_id, user_id, content, speaker, message_index) VALUES (?, ?, ?, ?, ?)",
        [convId, userId, question, "User", msgIndex]
      );
    } catch (err) {
      return reply.code(500).send({ message: "Failed to store message", error: err.message });
    }

    const aiUrl = process.env.AI_SERVICE_URL;
    if (!aiUrl) return reply.code(500).send({ message: "AI service not configured." });

    let convId = conversationId || "default-session";
    try {
      const lastMessages = await fastify.db.all(
        `SELECT 
          message_id,
          user_id,
          conversation_id,
          content,
          speaker,
          message_index,
          created_at
        FROM messages
        WHERE user_id = ? AND conversation_id = ?
        ORDER BY message_index DESC
        LIMIT 8`,
        [userId, convId]
      );

      const messageContext = lastMessages.reverse().map((msg) => ({
        role: msg.speaker === "User" ? "user" : "assistant",
        content: msg.content,
      }));

      const aiResText = await got
        .post(aiUrl, {
          json: { 
            user_id: userId, 
            question,
            conversationId: convId,
            messageContext: messageContext
          },
          headers: { "x-internal-secret": process.env.INTERNAL_API_KEY?.trim() },
          timeout: { request: 600000 },
        })
        .text();

      let parsedAnswer = aiResText;
      let sources = [];

      try {
        const metaStart = aiResText.indexOf("METADATA_START:");
        const metaEnd = aiResText.indexOf(":METADATA_END");
        if (metaStart !== -1 && metaEnd !== -1) {
          const jsonStr = aiResText.slice(metaStart + 15, metaEnd);
          try {
            const jsonStr_fixed = jsonStr
              .replace(/'/g, '"')
              .replace(/True/g, 'true')
              .replace(/False/g, 'false')
              .replace(/None/g, 'null');
            const metadata = JSON.parse(jsonStr_fixed);
            sources = metadata.sources || [];
          } catch (jsonErr) {
            console.error("Failed to parse metadata JSON:", jsonErr);
          }
          parsedAnswer = aiResText.substring(0, metaStart).concat(aiResText.substring(metaEnd + 13)).trim();
        }
      } catch (err) {
        console.error("Error processing metadata:", err);
      }

      try {
        const countAI = await fastify.db.get(
          "SELECT COUNT(*) AS count FROM messages WHERE user_id = ?",
          [userId]
        );
        const aiIndex = Number(countAI.count) + 1;
        await fastify.db.run(
          "INSERT INTO messages (conversation_id, user_id, content, speaker, message_index) VALUES (?, ?, ?, ?, ?)",
          [convId, userId, parsedAnswer, "AI", aiIndex]
        );
      } catch (err) {}

      return reply.code(200).send({
        aiMessage: parsedAnswer,
        sources,
        answer: parsedAnswer,
        conversationId: convId,
      });
    } catch (err) {
      return reply.code(502).send({ message: "AI service unavailable", error: err.message });
    }
  });

  fastify.get("/chat", async (req, reply) => {
    if (!req.user || !req.user.user_id)
      return reply.code(401).send({ message: "Authentication required." });

    const userId = Number(req.user.user_id);
    const conversationId = "default-session";

    try {
      const rows = await fastify.db.all(
        `SELECT 
          message_id,
          user_id,
          conversation_id,
          content,
          speaker,
          message_index,
          created_at
        FROM messages
        WHERE user_id = ? AND conversation_id = ?
        ORDER BY message_index ASC`,
        [userId, conversationId] 
      );

      const formattedMessages = rows.map((msg) => ({
        messageId: msg.message_id,
        role: msg.speaker === "User" ? "user" : "assistant",
        content: msg.content,
        index: msg.message_index,
        createdAt: msg.created_at,
      }));

      const responseStructure = [
        {
          conversationId: conversationId,
          userId: userId,
          messages: formattedMessages
        }
      ];

      return reply.code(200).send(responseStructure);
      
    } catch (err) {
      return reply.code(500).send({ message: "Failed to fetch messages", error: err.message });
    }
  });

}

export default chatRoutes;
