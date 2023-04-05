const bvn = document.getElementById("bvn2");
const time = document.getElementById("time-icon");
const hour = new Date().getHours();
const qc = document.getElementById("q-content");
const qa = document.getElementById("q-author");

if (hour >= 6 && hour < 12) {
  bvn.innerHTML = "Bonne matinée, " 
  time.src = '../workspace/img/cup-coffee.gif';
} else if (hour >= 12 && hour < 18) {
  bvn.innerHTML = "Bonne journée, ";
  time.src = "../workspace/utils/img/sub-sun.gif";
} else {
  bvn.innerHTML = "Bonne soirée, ";
  time.src = '../workspace/utils/img/universe-moon.gif';
}

async function updateQuote() {
  const response = await fetch("https://api.quotable.io/random");
  const data = await response.json();
  if (response.ok) {
    qc.textContent = data.content;
    qa.textContent = data.author;
  } else {
    quote.textContent = "An error occured";
    console.log(data);
  }
}

updateQuote();
