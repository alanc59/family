document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tree-container");
  const title = document.getElementById("tree-title");

  let tree = null;

  // Utility: format date to dd/mmm/yyyy
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  // Load people list into left panel
  fetch("/api/people")
    .then(res => res.json())
    .then(people => {
      const list = document.getElementById("people-list");
      list.innerHTML = "";
      people.forEach(p => {
        const li = document.createElement("li");
        const birth = formatDate(p.birthdate);
        li.textContent = birth ? `${p.name} (${birth})` : p.name;

        li.addEventListener("click", () => {
          // highlight selection in left panel
          document.querySelectorAll("#people-list li").forEach(el => el.classList.remove("selected"));
          li.classList.add("selected");

          // load this person’s family tree
          loadFamily(p.id, p.name);
        });
        list.appendChild(li);
      });
    });

  function loadFamily(personId, personName) {
    fetch(`/api/family/${personId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.person) {
          container.innerHTML = "<p>No family data found</p>";
          return;
        }

        // Update title
        title.textContent = `Family tree with ${personName} as the focus`;

        // Draw tree
        tree = new FamilyTree(container, data, { nodeWidth: 120 });
        tree.onNodeClick = showDetails; // right panel updates on node click
        tree.drawTree();

        // Highlight the focus person
        tree.highlightNode(personId);

        // Show focus person details immediately
        showDetails(data.person);
      });
  }

  function showDetails(person) {
    document.getElementById("detail-name").textContent = person.name || "";
    document.getElementById("detail-birth").textContent = formatDate(person.birthdate);
    document.getElementById("detail-death").textContent = formatDate(person.deathdate);
    document.getElementById("detail-bio").textContent = person.biography || "";
  }
});

