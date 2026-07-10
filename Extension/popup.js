const statusText = document.getElementById("status-text");
const spinner = document.getElementById("spinner");
const analyzeBtn = document.getElementById("analyze-btn");
const legendEl = document.getElementById("legend");
const hintEl = document.getElementById("hint");
const emptyState = document.getElementById("empty-state");

function setStatus(text, { loading = false } = {}) {
  statusText.textContent = text;
  spinner.classList.toggle("active", loading);
  analyzeBtn.disabled = loading;
}

analyzeBtn.addEventListener("click", async () => {
  setStatus("Extracting page content...", { loading: true });

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];

    if (!tab.url.includes("wikipedia.org")) {
      setStatus("Please open a Wikipedia page first.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "getText" }, async (response) => {
      if (!response || !response.text) {
        setStatus("Could not extract text. Refresh the page and try again.");
        return;
      }

      setStatus("Analyzing with NLP...", { loading: true });

      const urlParts = tab.url.split("/wiki/");
      const mainTopic = urlParts[1] ? decodeURIComponent(urlParts[1].replace(/_/g, " ")) : "";

      try {
        const res = await fetch("http://127.0.0.1:5000/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ text: response.text, main_topic: mainTopic })
        });

        const data = await res.json();

        if (!data.nodes || data.nodes.length === 0) {
          setStatus("No concepts found on this page.");
          return;
        }

        setStatus(`Found ${data.nodes.length} key concepts and ${data.edges.length} relationships.`);
        drawGraph(data.nodes, data.edges);

      } catch (err) {
        setStatus("Error connecting to backend. Make sure Flask is running.");
      }
    });
  });
});

function truncateLabel(text, max = 22) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

function drawGraph(nodes, edges) {
  emptyState.style.display = "none";
  legendEl.style.display = "block";
  hintEl.style.display = "block";

  const svg = d3.select("#graph");
  svg.selectAll("*").remove();

  const wrap = document.getElementById("graph-wrap");
  const width = wrap.clientWidth;
  const height = wrap.clientHeight;

  svg.attr("viewBox", [0, 0, width, height]);

  // A container group everything (links, nodes, labels) lives in, so zoom/pan
  // transforms the whole scene together.
  const scene = svg.append("g").attr("class", "scene");

  svg.call(
    d3.zoom()
      .scaleExtent([0.4, 3])
      .on("zoom", (event) => scene.attr("transform", event.transform))
  );

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(115).strength(0.5))
    .force("charge", d3.forceManyBody().strength(-420))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => (d.isMain ? 16 : Math.min(d.size, 14)) + 26));

  const link = scene.append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(edges)
    .enter().append("path")
    .attr("stroke", "#4a5578")
    .attr("stroke-opacity", 0.45)
    .attr("stroke-width", 1.1);

  const nodeGroup = scene.append("g")
    .selectAll("g")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node-group")
    .style("cursor", "pointer")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  nodeGroup.append("circle")
    .attr("r", d => d.isMain ? 17 : Math.min(d.size, 14))
    .attr("fill", d => d.color)
    .attr("stroke", d => d.isMain ? "#ffffff" : "#0e0e18")
    .attr("stroke-width", d => d.isMain ? 3 : 1.5)
    .style("filter", d => d.isMain ? "drop-shadow(0 0 8px rgba(255,255,255,0.35))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))");

  nodeGroup.append("title").text(d => `${d.id} (${d.category})`);

  // Labels get a dark halo behind the text (paint-order + stroke) so they stay
  // legible no matter what's behind them — an edge, another label, a node.
  const label = nodeGroup.append("text")
    .text(d => truncateLabel(d.id))
    .attr("font-size", d => d.isMain ? 13 : 11)
    .attr("font-weight", d => d.isMain ? 700 : 500)
    .attr("fill", "#f5f6fa")
    .attr("stroke", "#0b0b14")
    .attr("stroke-width", 3)
    .attr("paint-order", "stroke")
    .attr("dx", d => (d.isMain ? 22 : 18))
    .attr("dy", 4)
    .style("pointer-events", "none");

  // Hover focus: dim everything not connected to the hovered node.
  const linkedIds = new Map();
  edges.forEach(e => {
    const s = typeof e.source === "object" ? e.source.id : e.source;
    const t = typeof e.target === "object" ? e.target.id : e.target;
    if (!linkedIds.has(s)) linkedIds.set(s, new Set());
    if (!linkedIds.has(t)) linkedIds.set(t, new Set());
    linkedIds.get(s).add(t);
    linkedIds.get(t).add(s);
  });

  nodeGroup
    .on("mouseenter", (_event, d) => {
      const connected = linkedIds.get(d.id) || new Set();
      nodeGroup.style("opacity", n => (n.id === d.id || connected.has(n.id)) ? 1 : 0.18);
      link.style("opacity", l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return (s === d.id || t === d.id) ? 0.85 : 0.06;
      });
    })
    .on("mouseleave", () => {
      nodeGroup.style("opacity", 1);
      link.style("opacity", 1);
    });

  // Legend, rendered as HTML (not SVG) so it sits crisply above the graph
  // instead of competing visually with node labels.
  const categories = [...new Set(nodes.map(n => n.category))];
  legendEl.innerHTML = `<div class="legend-title">Entity types</div>` +
    categories.map(cat => {
      const color = nodes.find(n => n.category === cat)?.color || "#888";
      return `<div class="legend-row"><span class="dot" style="background:${color}"></span><span class="legend-label">${cat}</span></div>`;
    }).join("");

  simulation.on("tick", () => {
    link.attr("d", d => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.6; // gentle curve, reduces overlap at hub nodes
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    });

    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    // Leave the node pinned where the user dropped it — feels more intentional
    // than snapping back, and it's a small "care about the interaction" detail.
  }
}
