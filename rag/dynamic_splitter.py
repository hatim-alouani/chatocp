import re
from typing import List, Tuple, Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

class ChemicalNormalizer:
    
    CHEMICAL_SYNONYMS = {
        "acide phosphorique": ["H3PO4", "phosphoric acid"],
        "acide sulfurique": ["H2SO4", "sulfuric acid"],
        "phosphate": ["PO4", "phosphate rock"],
        "sulfate": ["SO4"],
        "TSP": ["triple superphosphate", "Ca(H2PO4)2"],
        "MAP": ["monoammonium phosphate", "NH4H2PO4"],
        "DAP": ["diammonium phosphate", "(NH4)2HPO4"],
    }
    
    @staticmethod
    def normalize_text(text: str) -> str:
        subscript_map = str.maketrans('₀₁₂₃₄₅₆₇₈₉', '0123456789')
        text = text.translate(subscript_map)
        
        # Convertir superscripts
        superscript_map = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻', '0123456789+-')
        text = text.translate(superscript_map)
        
        # Normaliser les espaces multiples
        text = re.sub(r'\s+', ' ', text)
        
        text = re.sub(r'(\d+)\s*%', r'\1%', text)
        
        text = re.sub(r'(\d+)\s*°C', r'\1°C', text)
        
        text = re.sub(r'(\d+)\s*-\s*(\d+)', r'\1-\2', text)
        
        return text.strip()
    
    @staticmethod
    def extract_entities(text: str) -> Dict[str, List[str]]:
        entities = {
            "formulas": [],
            "concentrations": [],
            "temperatures": [],
            "equipment": []
        }
        
        formulas = re.findall(r'\b[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*\b', text)
        entities["formulas"] = list(set(f for f in formulas if len(f) > 1))
        
        concentrations = re.findall(r'\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?%?\s*(?:P2O5|H2SO4|H3PO4)?', text)
        entities["concentrations"] = list(set(concentrations))
        
        temperatures = re.findall(r'\d+(?:\.\d+)?°C', text)
        entities["temperatures"] = list(set(temperatures))
        
        equipment_patterns = [
            r'filtre\w*', r'réacteur\w*', r'cristalliseur\w*',
            r'évaporateur\w*', r'broyeur\w*', r'sécheur\w*'
        ]
        for pattern in equipment_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["equipment"].extend(matches)
        
        entities["equipment"] = list(set(entities["equipment"]))
        
        return entities
    
    @staticmethod
    def is_section_header(text: str) -> bool:
        patterns = [
            r'^\d+\.\s+[A-Z]',
            r'^[A-Z\s]{5,}$',
            r'^Section\s+\d+',
            r'^CHAPITRE\s+\d+',
            r'^Annexe\s+[A-Z\d]',
        ]
        return any(re.match(pattern, text.strip()) for pattern in patterns)


class DynamicTechnicalTextSplitter:

    BASE = 1200
    OVERLAP = 250
    MAX_SIZE = 3000
    MIN_SIZE = 700

    TABLE_PATTERNS = [
        r'\|', r'\t', r'\s{4,}', r'(?:(?:\d+[,\.]?\d*)\s+){3,}'
    ]

    def __init__(self):
        self.normalizer = ChemicalNormalizer()
        self.default_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.BASE,
            chunk_overlap=self.OVERLAP,
            separators=["\n\n", "\n", ". ", ";", ","],
            length_function=len,
        )

    def detect_tables(self, text: str) -> List[Tuple[int, int]]:
        lines = text.splitlines(keepends=True)
        matches = []
        for ln in lines:
            if any(re.search(p, ln) for p in self.TABLE_PATTERNS):
                matches.append(True)
            else:
                matches.append(False)

        blocks = []
        start = None
        char = 0

        for i, ln in enumerate(lines):
            if matches[i] and start is None:
                start = char
            if not matches[i] and start is not None:
                blocks.append((start, char))
                start = None
            char += len(ln)

        if start is not None:
            blocks.append((start, char))

        return blocks

    def compute_size(self, text: str) -> Tuple[int, int]:
        entities = self.normalizer.extract_entities(text)
        complexity = (
            len(entities["formulas"]) +
            len(entities["concentrations"]) +
            len(entities["temperatures"])
        )

        size = self.BASE
        overlap = self.OVERLAP

        if complexity >= 6:
            size = int(size * 1.6)
            overlap = int(overlap * 1.4)
        elif complexity >= 3:
            size = int(size * 1.3)
            overlap = int(overlap * 1.2)

        if len(text) < 600:
            size = 99999
            overlap = 0

        size = max(self.MIN_SIZE, min(self.MAX_SIZE, size))
        overlap = max(0, min(int(size * 0.6), overlap))

        return size, overlap

    def split_documents(self, docs: List[Document]) -> List[Document]:
        chunks = []

        for doc in docs:
            text = doc.page_content
            size, overlap = self.compute_size(text)
            tables = self.detect_tables(text)

            # Build text segments to avoid splitting inside tables
            if not tables:
                segments = [(0, len(text))]
            else:
                segments = []
                cursor = 0
                for a, b in tables:
                    if cursor < a:
                        segments.append((cursor, a))
                    segments.append((a, b))
                    cursor = b
                if cursor < len(text):
                    segments.append((cursor, len(text)))

            for seg_start, seg_end in segments:
                seg_text = text[seg_start:seg_end].strip()
                if not seg_text:
                    continue

                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=size,
                    chunk_overlap=overlap,
                    separators=["\n\n", "\n", ". ", ";", ","],
                )

                seg_doc = Document(page_content=seg_text, metadata=doc.metadata.copy())
                seg_chunks = splitter.split_documents([seg_doc])

                for ch in seg_chunks:
                    ch.metadata["dynamic_size"] = size
                    ch.metadata["dynamic_overlap"] = overlap
                    chunks.append(ch)

        return chunks
