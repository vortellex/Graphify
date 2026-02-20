from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy

app = Flask(__name__)
CORS(app, origins="*", allow_headers=["Content-Type"])

nlp = spacy.load("en_core_web_sm")

JUNK_TYPES = {"CARDINAL", "ORDINAL", "QUANTITY", "PERCENT", "MONEY", "TIME"}

LABEL_MAP = {
    "PERSON": "person",
    "GPE": "place",
    "LOC": "place",
    "ORG": "organization",
    "EVENT": "event",
    "WORK_OF_ART": "work",
    "DATE": "date",
    "NORP": "group"
}

COLOR_MAP = {
    "person": "#ff6b6b",
    "place": "#00d4ff",
    "organization": "#ffd93d",
    "event": "#6bcb77",
    "work": "#c77dff",
    "group": "#ff9a3c",
    "other": "#888888"
}

def extract_graph(text, main_topic):
    doc = nlp(text)

    entity_freq = {}
    entity_type = {}

    for ent in doc.ents:
        if ent.label_ in JUNK_TYPES:
            continue
        if len(ent.text.strip()) < 2:
            continue
        if ent.text.strip().startswith("]") or ent.text.strip().startswith("["):
            continue
        clean = ent.text.strip()
        entity_freq[clean] = entity_freq.get(clean, 0) + 1
        entity_type[clean] = LABEL_MAP.get(ent.label_, "other")

    # Keep top 20 most frequent entities
    top_entities = sorted(entity_freq, key=entity_freq.get, reverse=True)[:20]

    # Always include main topic
    if main_topic and main_topic not in top_entities:
        top_entities.insert(0, main_topic)
        top_entities = top_entities[:20]

    top_set = set(top_entities)

    nodes = []
    for ent in top_entities:
        category = entity_type.get(ent, "other")
        nodes.append({
            "id": ent,
            "category": category,
            "color": COLOR_MAP.get(category, "#888888"),
            "size": 8 + (entity_freq.get(ent, 1) * 2),
            "isMain": ent == main_topic
        })

    edges = []
    seen_edges = set()
    for sent in doc.sents:
        ents_in_sent = [ent.text.strip() for ent in sent.ents
                       if ent.text.strip() in top_set and ent.label_ not in JUNK_TYPES]
        for i in range(len(ents_in_sent)):
            for j in range(i + 1, len(ents_in_sent)):
                a, b = ents_in_sent[i], ents_in_sent[j]
                key = tuple(sorted([a, b]))
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append({
                        "source": a,
                        "target": b,
                        "label": "related to"
                    })

    return {"nodes": nodes, "edges": edges}

@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data = request.get_json()
    text = data.get("text", "")
    main_topic = data.get("main_topic", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    graph = extract_graph(text, main_topic)
    return jsonify(graph)

if __name__ == "__main__":
    app.run(debug=True, port=5000)