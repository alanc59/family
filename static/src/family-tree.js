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
  }

  // Public: clear + draw the whole tree
  drawTree() {
    // clear container and create svg
    this.container.innerHTML = "";
    this.svg = document.createElementNS(this.svgNS, "svg");
    this.container.appendChild(this.svg);

    // layout pass (computes subtree widths and centerX)
    this.computeLayout(this.data, 0, 0);

    // render pass
    this.render(this.data, 20);

    // size the SVG to content
    const bbox = this.svg.getBBox();
    const pad = 40;
    this.svg.setAttribute("width", Math.max(800, bbox.width + pad));
    this.svg.setAttribute("height", bbox.height + pad);
    this.svg.setAttribute(
      "viewBox",
      `${bbox.x - pad/2} ${bbox.y - pad/2} ${bbox.width + pad} ${bbox.height + pad}`
    );
  }

  // Recursive layout: compute subtreeWidth and initial centerX
  computeLayout(node, depth, xOffset) {
    node.depth = depth;

    // children widths
    let childrenWidths = 0;
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childWidth = this.computeLayout(child, depth + 1, xOffset + childrenWidths);
        childrenWidths += childWidth + this.hSpacing;
      }
      childrenWidths -= this.hSpacing; // remove trailing spacing
    }

    // reserve couple width if married
    const coupleWidth = node.spouse ? (this.nodeWidth * 2 + this.hSpacing) : this.nodeWidth;

    node.subtreeWidth = Math.max(coupleWidth, childrenWidths || 0);
    node.centerX = xOffset + node.subtreeWidth / 2;

    // Important: do not set mainCenterX here (we calculate it in render pass before drawing connectors)
    return node.subtreeWidth;
  }

  // Render node and subtree at vertical position y
  render(node, y) {
    // compute person (left spouse or single) center within this subtree
    let personCenterX = node.centerX;
    if (node.spouse) {
      // shift left so couple is centered inside subtree
      personCenterX = node.centerX - (this.nodeWidth + this.hSpacing) / 2;
    }

    // Draw the main person box and record the real center of this person's box
    const personLeft = personCenterX - this.nodeWidth / 2;
    this.drawNode(personLeft, y, node);
    node.mainCenterX = personCenterX;

    let marriageY = null;
    if (node.spouse) {
      // compute spouse center and draw
      const spouseCenterX = personCenterX + this.nodeWidth + this.hSpacing;
      const spouseLeft = spouseCenterX - this.nodeWidth / 2;
      this.drawNode(spouseLeft, y, node.spouse);

      // draw marriage line between the inner edges of boxes (no visual gap)
      marriageY = y + this.nodeHeight / 2;
      const leftEdge = personCenterX + this.nodeWidth / 2;
      const rightEdge = spouseCenterX - this.nodeWidth / 2;
      this.drawLine(leftEdge, marriageY, rightEdge, marriageY);

      // small descent marker from marriage center
      const marriageCenterX = (personCenterX + spouseCenterX) / 2;
      const descentStartY = marriageY;
      const descentEndY = marriageY + this.descentLength;
      this.drawLine(marriageCenterX, descentStartY, marriageCenterX, descentEndY);

      // redefine node.centerX to the marriage midpoint for sibling spacing
      node.centerX = marriageCenterX;

      // ensure spouse convenience fields (not used for ancestry lines)
      node.spouse.centerX = spouseCenterX;
      node.spouse.mainCenterX = spouseCenterX;
    }

    // Children rendering & connectors
    if (node.children && node.children.length > 0) {
      const childY = y + this.nodeHeight + this.vSpacing;

      // First: compute each child's biological box center (mainCenterX)
      const childCenters = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // If child has spouse, its subtree center (child.centerX) is the couple midpoint;
        // the biological child's box center is the left partner center:
        const childMainCenter = child.spouse
          ? (child.centerX - (this.nodeWidth + this.hSpacing) / 2)
          : child.centerX;
        child.mainCenterX = childMainCenter;
        childCenters.push(childMainCenter);
      }

      // Special-case: single child alignment
      if (node.children.length === 1) {
        const singleChild = node.children[0];
        const dx = node.centerX - singleChild.centerX; // align subtree center to parent center
        if (dx !== 0) {
          this.shiftSubtree(singleChild, dx);
          // shifting updated child.centerX and child.mainCenterX
          childCenters[0] = singleChild.mainCenterX;
        }
      }

      // Now compute rail endpoints from biological centers
      const left = Math.min(...childCenters);
      const right = Math.max(...childCenters);
      const railY = childY - this.nodeHeight / 2;

      // Parent connection point: if married use bottom of descent marker (descentEndY),
      // otherwise bottom of parent box
      const parentConnectionY = marriageY ? (marriageY + this.descentLength) : (y + this.nodeHeight);

      // Vertical stem down to rail
      this.drawLine(node.centerX, parentConnectionY, node.centerX, railY);

      // Horizontal rail across children (if left==right it's a single point)
      this.drawLine(left, railY, right, railY);

      // For each child: draw leg from rail to child's main center, then vertical into the child's box,
      // then render the child's subtree (child boxes drawn after lines so they appear above).
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const targetX = child.mainCenterX;
        // horizontal from rail to child's main center
        this.drawLine(node.centerX, railY, targetX, railY);
        // vertical down into child's box top
        this.drawLine(targetX, railY, targetX, childY);
        // render child subtree (draws child's boxes and recursively its children)
        this.render(child, childY);
      }
    }
  }

  // shift an entire subtree horizontally (updates centerX and mainCenterX)
  shiftSubtree(node, dx) {
    node.centerX += dx;
    if (typeof node.mainCenterX === "number") node.mainCenterX += dx;
    if (node.spouse && typeof node.spouse.mainCenterX === "number") {
      node.spouse.mainCenterX += dx;
      node.spouse.centerX += dx;
    }
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        this.shiftSubtree(node.children[i], dx);
      }
    }
  }

  // Draw a rounded rect + centered name
  drawNode(x, y, person) {
    const rect = document.createElementNS(this.svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", this.nodeWidth);
    rect.setAttribute("height", this.nodeHeight);
    rect.setAttribute("fill", "#ffffff");
    rect.setAttribute("stroke", "#333333");
    rect.setAttribute("rx", 6);
    rect.setAttribute("ry", 6);
    this.svg.appendChild(rect);

    const text = document.createElementNS(this.svgNS, "text");
    text.setAttribute("x", x + this.nodeWidth / 2);
    text.setAttribute("y", y + this.nodeHeight / 2 + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    text.setAttribute("font-size", 14);
    text.textContent = person.name || "";
    this.svg.appendChild(text);
  }

  // Draw a simple straight line (stroke)
  drawLine(x1, y1, x2, y2) {
    const line = document.createElementNS(this.svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#333");
    line.setAttribute("stroke-width", 2);
    this.svg.appendChild(line);
  }
}

// Export for CommonJS if needed
if (typeof module !== "undefined") {
  module.exports = FamilyTree;
}

