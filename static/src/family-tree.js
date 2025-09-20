// static/src/family-tree.js
class FamilyTree {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.nodeWidth = options.nodeWidth || 120;
    this.nodeHeight = options.nodeHeight || 50;
    this.hSpacing = options.hSpacing || 40;
    this.vSpacing = options.vSpacing || 80;
    this.descentLength = options.descentLength || 12;
    this.svgNS = "http://www.w3.org/2000/svg";

    this.selectedId = null;
  }

  // Draw everything
  drawTree() {
    this.container.innerHTML = "";
    this.svg = document.createElementNS(this.svgNS, "svg");
    this.container.appendChild(this.svg);

    // Compute layout and person centers
    this.computeLayout(this.data, 0, 0);

    // Render pass
    this.render(this.data, 20);

    // Fit SVG to contents
    const bbox = this.svg.getBBox();
    const pad = 40;
    this.svg.setAttribute("width", Math.max(800, bbox.width + pad));
    this.svg.setAttribute("height", bbox.height + pad);
    this.svg.setAttribute(
      "viewBox",
      `${bbox.x - pad / 2} ${bbox.y - pad / 2} ${bbox.width + pad} ${bbox.height + pad}`
    );
  }

  // Normalize wrapper vs person shapes into consistent structure
  normalize(node) {
    if (!node) return null;
    if (node.__norm) return node.__norm;

    if (node.person) {
      const norm = {
        person: node.person,
        spouses: Array.isArray(node.spouses) ? node.spouses.filter(Boolean) : (node.spouse ? [node.spouse] : []),
        children: Array.isArray(node.children) ? node.children.filter(Boolean) : [],
        layout: {}
      };
      node.__norm = norm;
      return norm;
    }

    // node is a person object
    const person = node;
    const spouses = [];
    if (person.spouse) spouses.push(person.spouse);
    if (Array.isArray(person.spouses)) spouses.push(...person.spouses);
    const children = Array.isArray(person.children) ? person.children.slice() : [];

    const norm = {
      person: person,
      spouses: spouses.filter(Boolean),
      children: children.filter(Boolean),
      layout: {}
    };
    node.__norm = norm;
    return norm;
  }

  // Compute subtree widths/centers and also personCenterX for the main person box
  computeLayout(origNode, depth, xOffset) {
    const node = this.normalize(origNode);
    if (!node) return 0;

    node.layout.depth = depth;

    // compute children's widths (sum of subtrees)
    let childrenWidths = 0;
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const childOrig = node.children[i];
        const w = this.computeLayout(childOrig, depth + 1, xOffset + childrenWidths);
        childrenWidths += w + this.hSpacing;
      }
      childrenWidths -= this.hSpacing;
    }

    // compute width for couple block (main person + spouses side-by-side)
    const spouseCount = node.spouses ? node.spouses.length : 0;
    const coupleCount = 1 + spouseCount;
    const coupleTotalWidth = this.nodeWidth * coupleCount + this.hSpacing * Math.max(0, coupleCount - 1);

    node.layout.subtreeWidth = Math.max(coupleTotalWidth, childrenWidths || 0);
    node.layout.centerX = xOffset + node.layout.subtreeWidth / 2;

    // compute main person's center (personCenterX) inside the couple block:
    // startLeft = centerX - coupleTotalWidth/2; personCenterX = startLeft + nodeWidth/2
    node.layout.personCenterX = node.layout.centerX - (coupleTotalWidth / 2) + (this.nodeWidth / 2);

    return node.layout.subtreeWidth;
  }

  // Render a node wrapper (origNode may be wrapper or plain person)
  render(origNode, y) {
    const node = this.normalize(origNode);
    if (!node) return;

    const layout = node.layout;
    if (!layout || typeof layout.centerX !== "number") {
      console.warn("Missing layout for node", node);
      return;
    }

    // compute couple block left so it's centered on layout.centerX
    const spouseCount = node.spouses ? node.spouses.length : 0;
    const coupleCount = 1 + spouseCount;
    const coupleTotalWidth = this.nodeWidth * coupleCount + this.hSpacing * Math.max(0, coupleCount - 1);
    const startLeft = layout.centerX - coupleTotalWidth / 2;

    // draw main person at startLeft
    const mainLeft = startLeft;
    this.drawNode(mainLeft, y, node.person);

    // draw spouses to the right of main person
    const spouseLefts = [];
    let currLeft = mainLeft + this.nodeWidth + this.hSpacing;
    if (node.spouses && node.spouses.length > 0) {
      for (let sp of node.spouses) {
        if (!sp) continue;
        spouseLefts.push(currLeft);
        this.drawNode(currLeft, y, sp);
        currLeft += this.nodeWidth + this.hSpacing;
      }
    }

    // compute parent connector (where children descend from)
    let parentConnectorX, parentConnectorY;
    if (spouseLefts.length > 0) {
      // inner right edge of main = mainLeft + nodeWidth
      const leftInnerX = mainLeft + this.nodeWidth;
      // inner left edge of rightmost spouse = rightmost spouse left
      const rightmostLeft = spouseLefts[spouseLefts.length - 1];
      const rightInnerX = rightmostLeft;
      const marriageY = y + this.nodeHeight / 2;

      // draw marriage line from leftInnerX to rightInnerX (inner edges)
      this.drawLine(leftInnerX, marriageY, rightInnerX, marriageY);

      // descent from marriage midpoint
      const marriageMidX = (leftInnerX + rightInnerX) / 2;
      this.drawLine(marriageMidX, marriageY, marriageMidX, marriageY + this.descentLength);

      parentConnectorX = marriageMidX;
      parentConnectorY = marriageY + this.descentLength;
    } else {
      // no spouses — children descend from bottom of main person
      parentConnectorX = layout.personCenterX;
      parentConnectorY = y + this.nodeHeight;
    }

    // Children
    if (node.children && node.children.length > 0) {
      const childY = y + this.nodeHeight + this.vSpacing;
      const railY = childY - this.nodeHeight / 2;

      // collect child's biological centers (personCenterX)
      const childCenters = [];
      for (let childOrig of node.children) {
        const cNorm = this.normalize(childOrig);
        if (!cNorm || !cNorm.layout) continue;
        // prefer personCenterX (anchor to child's own box), fallback to centerX
        const cCenter = (typeof cNorm.layout.personCenterX === "number") ? cNorm.layout.personCenterX : cNorm.layout.centerX;
        childCenters.push(cCenter);
      }

      if (childCenters.length === 0) {
        return;
      }

      // special-case single child alignment: align child's subtree center to parentConnectorX
      if (node.children.length === 1) {
        const singleChildOrig = node.children[0];
        const singleChildNorm = this.normalize(singleChildOrig);
        const dx = parentConnectorX - singleChildNorm.layout.centerX;
        if (dx !== 0) {
          this.shiftSubtree(singleChildOrig, dx);
          // update centers after shift
          const updated = this.normalize(singleChildOrig);
          childCenters[0] = (typeof updated.layout.personCenterX === "number") ? updated.layout.personCenterX : updated.layout.centerX;
        }
      }

      // parent vertical down to rail
      this.drawLine(parentConnectorX, parentConnectorY, parentConnectorX, railY);

      // horizontal rail across child centers
      const left = Math.min(...childCenters);
      const right = Math.max(...childCenters);
      this.drawLine(left, railY, right, railY);

      // for each child: horizontal leg to child's person center, then vertical down, then render child subtree
      for (let childOrig of node.children) {
        const cNorm = this.normalize(childOrig);
        if (!cNorm || !cNorm.layout) continue;
        const targetX = (typeof cNorm.layout.personCenterX === "number") ? cNorm.layout.personCenterX : cNorm.layout.centerX;
        this.drawLine(parentConnectorX, railY, targetX, railY);
        this.drawLine(targetX, railY, targetX, childY);
        this.render(childOrig, childY);
      }
    }
  }

  // Shift subtree horizontally (updates centerX and personCenterX)
  shiftSubtree(origNode, dx) {
    const node = this.normalize(origNode);
    if (!node || !node.layout) return;
    node.layout.centerX += dx;
    if (typeof node.layout.personCenterX === "number") node.layout.personCenterX += dx;
    if (node.children && node.children.length > 0) {
      for (let c of node.children) this.shiftSubtree(c, dx);
    }
  }

  // Draw single person rectangle (x,y top-left)
  drawNode(x, y, person) {
    if (!person || typeof person.id === "undefined") {
      console.warn("Skipping invalid person:", person);
      return;
    }

    const rect = document.createElementNS(this.svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", this.nodeWidth);
    rect.setAttribute("height", this.nodeHeight);
    rect.setAttribute("rx", 6);
    rect.setAttribute("ry", 6);
    rect.setAttribute("stroke-width", 2);

    if (person.id === this.selectedId) {
      rect.setAttribute("fill", "#e67e22");
      rect.setAttribute("stroke", "#ca5d0d");
    } else {
      rect.setAttribute("fill", "#3498db");
      rect.setAttribute("stroke", "#2c3e50");
    }
    this.svg.appendChild(rect);

    const text = document.createElementNS(this.svgNS, "text");
    text.setAttribute("x", x + this.nodeWidth / 2);
    text.setAttribute("y", y + this.nodeHeight / 2);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    text.setAttribute("font-size", 14);
    text.setAttribute("fill", person.id === this.selectedId ? "#000000" : "#ffffff");
    text.textContent = person.name || "(unnamed)";
    this.svg.appendChild(text);

    // click always fetches full record
    rect.addEventListener("click", () => this.handleClick(person));
    text.addEventListener("click", () => this.handleClick(person));
  }

  // draw straight line
  drawLine(x1, y1, x2, y2) {
    const line = document.createElementNS(this.svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#34495e");
    line.setAttribute("stroke-width", 2);
    this.svg.appendChild(line);
  }

  // click handler: fetch full person then call callback
  handleClick(person) {
    if (!person || typeof person.id === "undefined") {
      console.warn("Clicked node with no id:", person);
      return;
    }

    fetch(`/api/person/${encodeURIComponent(person.id)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch person details");
        return res.json();
      })
      .then(data => {
        this.selectedId = person.id;
        this.drawTree();
        if (typeof this.onNodeClick === "function") {
          this.onNodeClick(data);
        }
      })
      .catch(err => {
        console.error("Error fetching person details:", err);
      });
  }

  // External: highlight node by id
  highlightNode(id) {
    this.selectedId = id;
    this.drawTree();
  }
}

window.FamilyTree = FamilyTree;

