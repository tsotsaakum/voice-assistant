(function () {
  var forms = document.querySelectorAll(".am-form");
  for (var i = 0; i < forms.length; i++) {
    (function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = form.querySelector(".am-ok");
        if (ok) ok.hidden = false;
        form.classList.add("am-form--done");
      });
    })(forms[i]);
  }
})();
