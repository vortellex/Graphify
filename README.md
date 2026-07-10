# ⚡ Graphify
### Transform Wikipedia into Interactive Knowledge Graphs

Currently in it's early stage of development.

Graphify is a Chrome extension that reads any Wikipedia page and converts it 
into a visual, interactive knowledge graph — making complex information easier 
to explore and understand at a glance.

---

## 📸 Demo

> Open any Wikipedia page → Click the Graphify extension → See key concepts 
and relationships rendered as an interactive graph instantly.

---

## 🚀 Features

- Extracts top 20 key concepts from any Wikipedia page
- Color coded nodes by entity type — people, places, organizations, events
- Interactive graph — drag nodes, hover for details
- Node size scales with concept importance on the page
- Filters out noise like dates, numbers and irrelevant entities
- Powered by real NLP — not just keyword matching

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Chrome Extension | HTML, CSS, Vanilla JavaScript |
| Graph Visualization | D3.js (Force Directed Graph) |
| Backend API | Python, Flask, Flask-CORS |
| NLP Engine | spaCy (en_core_web_sm) |

---

## ⚙️ How to Run

### 1. Clone the repository
```
git clone https://github.com/vortellex/Graphify.git
cd Graphify
```

### 2. Set up the backend
```
pip install flask spacy flask-cors
python -m spacy download en_core_web_sm
python Backend/app.py
```

### 3. Load the extension in Chrome
- Go to `chrome://extensions`
- Enable **Developer Mode** (top right)
- Click **Load Unpacked**
- Select the `Extension` folder

### 4. Use it
- Open any Wikipedia page
- Click the Graphify icon in your toolbar
- Click **Analyze Page**

---

## 🔬 How It Works

1. Extension reads the Wikipedia page content via `content.js`
2. Text is sent to the Flask backend via a POST request
3. spaCy NLP extracts named entities (people, places, organizations, events)
4. Top 20 most frequent and relevant concepts are selected
5. Relationships are mapped based on co-occurrence within sentences
6. D3.js renders the result as an interactive force-directed graph

---

## 🗺️ Roadmap

- [ ] Semantic relationship labeling (born in, worked at, developed)
- [ ] Support for any website beyond Wikipedia
- [ ] User accounts to save and revisit graphs
- [ ] Export graph as image or PDF

---

## 👨‍💻 Author

**Shubham Kumar Gupta**  
github.com/vortellex
