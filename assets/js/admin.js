(function () {
  "use strict";

  var STORAGE_KEY = "va-kien-guest-links-v1";
  var MAX_RECENT = 12;

  var form = document.getElementById("guestForm");
  var input = document.getElementById("guestName");
  var errorEl = document.getElementById("formError");
  var result = document.getElementById("result");
  var linkInput = document.getElementById("guestLink");
  var openBtn = document.getElementById("openBtn");
  var copyBtn = document.getElementById("copyBtn");
  var newBtn = document.getElementById("newBtn");
  var statusEl = document.getElementById("copyStatus");
  var recentList = document.getElementById("recentList");
  var recentEmpty = document.getElementById("recentEmpty");
  var clearBtn = document.getElementById("clearBtn");

  var statusTimer = 0;
  var recent = loadRecent();

  function normalizeName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function makeLink(name) {
    var url = new URL("index.html", window.location.href);
    url.searchParams.set("guest", name);
    return url.href;
  }

  function loadRecent() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter(function (item) {
          return item && typeof item.name === "string" && typeof item.link === "string";
        })
        .slice(0, MAX_RECENT);
    } catch (err) {
      return [];
    }
  }

  function saveRecent() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch (err) {
      /* localStorage may be unavailable; the page still works. */
    }
  }

  function setStatus(message) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    window.clearTimeout(statusTimer);
    if (message) {
      statusTimer = window.setTimeout(function () {
        statusEl.textContent = "";
      }, 3200);
    }
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.left = "-1000px";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();

      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (ok) {
          resolve();
        } else {
          reject(new Error("copy command failed"));
        }
      } catch (err) {
        document.body.removeChild(area);
        reject(err);
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function addRecent(name, link) {
    recent = recent.filter(function (item) {
      return item.name !== name && item.link !== link;
    });
    recent.unshift({
      name: name,
      link: link,
      time: Date.now()
    });
    recent = recent.slice(0, MAX_RECENT);
    saveRecent();
    renderRecent();
  }

  function renderRecent() {
    if (!recentList) {
      return;
    }

    recentList.textContent = "";
    if (recentEmpty) {
      recentEmpty.hidden = recent.length > 0;
    }
    if (clearBtn) {
      clearBtn.hidden = recent.length === 0;
    }

    recent.forEach(function (item) {
      var row = document.createElement("li");
      row.className = "admin__recent";

      var info = document.createElement("div");
      info.className = "admin__recent-info";

      var name = document.createElement("strong");
      name.textContent = item.name;

      var link = document.createElement("span");
      link.textContent = item.link;
      link.title = item.link;

      info.appendChild(name);
      info.appendChild(link);

      var actions = document.createElement("div");
      actions.className = "admin__recent-actions";

      var copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "Chép";
      copy.addEventListener("click", function () {
        copyText(item.link)
          .then(function () {
            copy.textContent = "Đã chép";
            window.setTimeout(function () {
              copy.textContent = "Chép";
            }, 1400);
          })
          .catch(function () {
            copy.textContent = "Lỗi";
            window.setTimeout(function () {
              copy.textContent = "Chép";
            }, 1400);
          });
      });

      var open = document.createElement("a");
      open.href = item.link;
      open.target = "_blank";
      open.rel = "noopener";
      open.textContent = "Mở";

      actions.appendChild(copy);
      actions.appendChild(open);
      row.appendChild(info);
      row.appendChild(actions);
      recentList.appendChild(row);
    });
  }

  function showError(message) {
    if (!errorEl) {
      return;
    }
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  }

  if (form && input && result && linkInput && openBtn) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();

      var name = normalizeName(input.value);
      if (!name) {
        showError("Vui lòng nhập tên khách hoặc cặp đôi.");
        input.focus();
        return;
      }

      var link = makeLink(name);
      linkInput.value = link;
      openBtn.href = link;
      result.hidden = false;
      setStatus("");
      addRecent(name, link);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        result.scrollIntoView({ block: "nearest" });
      } else {
        result.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    input.addEventListener("input", clearError);

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (!linkInput.value) {
          return;
        }
        copyText(linkInput.value)
          .then(function () {
            setStatus("Đã sao chép link. Gửi cho khách nhé!");
          })
          .catch(function () {
            setStatus("Không sao chép tự động được, bạn hãy chọn link và copy thủ công.");
          });
      });
    }

    if (newBtn) {
      newBtn.addEventListener("click", function () {
        result.hidden = true;
        linkInput.value = "";
        openBtn.href = "#";
        setStatus("");
        clearError();
        input.value = "";
        input.focus();
      });
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!recent.length) {
        return;
      }
      if (!window.confirm("Xóa tất cả link đã tạo trên thiết bị này?")) {
        return;
      }
      recent = [];
      saveRecent();
      renderRecent();
      if (result) {
        result.hidden = true;
      }
      setStatus("");
    });
  }

  renderRecent();
})();
