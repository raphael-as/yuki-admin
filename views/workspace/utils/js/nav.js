function nav() {
    var nav = document.getElementById("nav");
    var panel_main_side = document.querySelector(".panel__main-side");
    
    if (nav.className === "") {
      nav.className += "open";
      panel_main_side.style.width = "300px";
    } else {
      nav.className = "";
      panel_main_side.style.width = "0";
    }
  }
  