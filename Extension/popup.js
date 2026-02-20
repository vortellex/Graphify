document.getElementById("analyze-btn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  status.textContent = "Extracting page content...";

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];

    if (!tab.url.includes("wikipedia.org")) {
      status.textContent = "Please open a Wikipedia page first.";
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "getText" }, async (response) => {
      if (!response || !response.text) {
        status.textContent = "Could not extract text. Refresh the page and try again.";
        return;
      }

      status.textContent = "Analyzing with NLP...";

      // Extract main topic from page title
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
          status.textContent = "No concepts found on this page.";
          return;
        }

        status.textContent = `Found ${data.nodes.length} key concepts and ${data.edges.length} relationships.`;
        drawGraph(data.nodes, data.edges, mainTopic);

      } catch (err) {
        status.textContent = "Error connecting to backend. Make sure Flask is running.";
      }
    });
  });
});

function drawGraph(nodes, edges, mainTopic) {
  const svg = d3.select("#graph");
  svg.selectAll("*").remove();

  const width = 800;
  const height = 520;

  svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#444");

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(40));

  const link = svg.append("g")
    .selectAll("line")
    .data(edges)
    .enter().append("line")
    .attr("stroke", "#333")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1);

  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", d => d.isMain ? 16 : Math.min(d.size, 14))
    .attr("fill", d => d.color)
    .attr("stroke", d => d.isMain ? "white" : "#1a1a1a")
    .attr("stroke-width", d => d.isMain ? 3 : 1.5)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  // Tooltip
  node.append("title").text(d => `${d.id} (${d.category})`);

  const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .enter().append("text")
    .text(d => d.id)
    .attr("font-size", d => d.isMain ? 13 : 10)
    .attr("font-weight", d => d.isMain ? "bold" : "normal")
    .attr("fill", "white")
    .attr("dx", 14)
    .attr("dy", 4);

  // Legend
  const categories = [...new Set(nodes.map(n => n.category))];
  const legend = svg.append("g").attr("transform", "translate(10, 10)");
  categories.forEach((cat, i) => {
    const color = nodes.find(n => n.category === cat)?.color || "#888";
    legend.append("circle").attr("cx", 6).attr("cy", i * 18).attr("r", 5).attr("fill", color);
    legend.append("text").attr("x", 14).attr("y", i * 18 + 4).text(cat).attr("font-size", 10).attr("fill", "#ccc");
  });

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
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
    d.fx = null;
    d.fy = null;
  }
}