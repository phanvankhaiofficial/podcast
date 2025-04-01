let player;
let videoData = [
  {
    name: "LayLa",
    id: "535",
    title: "日本と比べてオーストラリアのいいところ",
    videoId: "CU_F-JFvL8I",
    subtitleFile: "srt/535.srt",
  },
];

document.addEventListener("DOMContentLoaded", function () {
  loadVideoList();
  setupMenuToggle();

  const furiganaToggle = document.getElementById("furiganaToggle");

  // Hàm debounce
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Tạo phiên bản debounce của hàm xử lý furigana
  const debouncedFuriganaUpdate = debounce(async (checked) => {
    await furiganaSubtitleList();
  }, 500); // Đặt delay 500ms (có thể điều chỉnh)

  // Thêm sự kiện khi toggle thay đổi
  furiganaToggle.addEventListener("change", function () {
    // Gọi hàm debounced
    debouncedFuriganaUpdate(this.checked);
  });
});

function onYouTubeIframeAPIReady() {
  const lastVideo = JSON.parse(localStorage.getItem("lastVideo"));
  if (lastVideo) {
    showResumeDialog(lastVideo);
  } else {
    loadVideo(videoData[0].videoId, videoData[0].subtitleFile);
  }
}

function showResumeDialog(lastVideo) {
  // Kiểm tra dữ liệu trước khi bắt đầu
  if (
    !lastVideo ||
    !lastVideo.videoId ||
    !lastVideo.subtitleFile ||
    !lastVideo.currentTime ||
    !lastVideo.title ||
    !lastVideo.titleVi ||
    !lastVideo.ep ||
    !lastVideo.name
  ) {
    // Nếu thiếu dữ liệu, gọi loadDefaultVideo và dừng hàm
    loadVideo(videoData[0].videoId, videoData[0].subtitleFile);
    return;
  }
  const modalHTML = `
<div class="modal fade" id="resumeModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content" style="background: linear-gradient(45deg, #96b289, #f5b679);">
      <div class="modal-header">
        <h5 class="modal-title">Tiếp tục xem video?</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body text-center">
        <div class="img-container" style="margin: 0 auto; height: 180px; width: 320px; max-width:90%; position: relative; overflow: hidden; border-radius: 8px;">
          <img src="https://img.youtube.com/vi/${
            lastVideo.videoId
          }/mqdefault.jpg" class="img-fluid" alt="Thumbnail" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
        </div>
        <p style="margin: 0;"><strong>[${lastVideo.name}] #${
    lastVideo.ep
  }</strong></p>
        <p style="margin: 0;"><strong>${lastVideo.titleVi}</strong></p>
        <p style="margin: 0;">${lastVideo.title}</p>
        <p style="margin: 10px 0 0 0;">Bạn đã xem đến <strong>${formatTime(
          lastVideo.currentTime
        )}</strong></p>
      </div>
      <div class="modal-footer">
        <button id="resumeBtn" class="btn btn-outline-success">Tiếp tục</button>
        <button id="skipBtn" class="btn btn-outline-danger" data-bs-dismiss="modal">Bỏ qua</button>
      </div>
    </div>
  </div>
</div>
    `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const modal = new bootstrap.Modal(document.getElementById("resumeModal"));
  modal.show();

  // Nút "Tiếp tục"
  document.getElementById("resumeBtn").addEventListener("click", () => {
    modal.hide();
    loadVideo(lastVideo.videoId, lastVideo.subtitleFile);

    // Đợi video tải xong rồi mới tua
    const checkPlayerReady = setInterval(() => {
      if (player && player.getPlayerState() !== -1) {
        // Kiểm tra nếu player đã sẵn sàng
        clearInterval(checkPlayerReady);
        player.seekTo(lastVideo.currentTime, true);
      }
    }, 500); // Kiểm tra mỗi 500ms
  });

  // Nút "Bỏ qua" hoặc nhấn X (đóng modal)
  const skipButton = document.getElementById("skipBtn");
  const closeButton = document.querySelector(".btn-close");

  const loadDefaultVideo = () => {
    modal.hide();
    loadVideo(videoData[0].videoId, videoData[0].subtitleFile);
  };

  skipButton.addEventListener("click", loadDefaultVideo);
  closeButton.addEventListener("click", loadDefaultVideo);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
}

function loadVideo(videoId, subtitleFile) {
  if (player) {
    player.loadVideoById(videoId);
  } else {
    player = new YT.Player("player", {
      videoId: videoId,
      playerVars: {
        controls: 1, // Hiển thị toàn bộ controls
        modestbranding: 0, // Cho phép hiển thị logo YouTube
        rel: 0, // Hiển thị video liên quan
        showinfo: 0, // Hiển thị thông tin video
        disablekb: 0, // Bật phím tắt
        fs: 0, // Cho phép full-screen
        playsinline: 1, // Hỗ trợ phát inline trên iOS
        autoplay: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        hl: "vi",
      },
      events: {
        onReady: onPlayerReady,
      },
    });
  }

  loadSubtitles(subtitleFile);
}

let adCheckInterval;
let isAdPlaying = false;

function onPlayerReady(event) {
  setInterval(updateSubtitle, 500);

  // Thêm listener cho trạng thái player
  event.target.addEventListener("onStateChange", function (e) {
    // PLAYING = 1, PAUSED = 2, ENDED = 0
    isVideoPlaying = e.data === YT.PlayerState.PLAYING;
    updatePlayButton();
  });

  // Khởi tạo nút play và cập nhật nút play trong toolbar
  setupPlayButton();
  updatePlayButton();
}

let subtitles = [];
function loadSubtitles(subtitleFile) {
  fetch(subtitleFile)
    .then((response) => response.text())
    .then((data) => {
      subtitles = parseSRT(data);
      renderSubtitleList();
    })
    .catch((error) => console.error("Lỗi tải phụ đề:", error));
}

function parseSRT(srt) {
  return srt
    .trim()
    .split("\n\n")
    .map((entry) => {
      const lines = entry.split("\n");
      if (lines.length < 2) return null;
      const time = lines[1].split(" --> ");
      return {
        start: toSeconds(time[0]),
        end: toSeconds(time[1]),
        text: lines.slice(2).join("\r\n"),
      };
    })
    .filter((sub) => sub !== null);
}

function toSeconds(time) {
  const [h, m, s] = time.replace(",", ".").split(":");
  return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
}

function updateSubtitle() {
  if (player && player.getCurrentTime) {
    const time = player.getCurrentTime();
    const sub = subtitles.find((s) => time >= s.start && time <= s.end);

    highlightActiveSubtitle(sub);

    // Nếu đang trong chế độ lặp lại của nút repeat trong toolbar
    if (isRepeatMode && currentRepeatRange) {
      if (time < currentRepeatRange.start || time > currentRepeatRange.end) {
        player.seekTo(currentRepeatRange.start, true);
      }
    }

    // ✅ Lưu trạng thái video vào localStorage nếu thời gian > 60 giây
    const currentVideo = videoData.find(
      (v) => v.videoId === player.getVideoData().video_id
    );
    if (currentVideo) {
      if (time > 60) {
        localStorage.setItem(
          "lastVideo",
          JSON.stringify({
            videoId: player.getVideoData().video_id,
            currentTime: time,
            subtitleFile: currentVideo.subtitleFile || "",
            title: currentVideo.title || "",
            titleVi: currentVideo.titleVi || "",
            ep: currentVideo.ep || "",
            name: currentVideo.name || "",
          })
        );
      }
    } else {
      // Nếu không tìm thấy video hoặc video chưa đủ 60 giây, xóa dữ liệu trong localStorage
      localStorage.removeItem("lastVideo");
    }

    // Nếu video chưa đủ 60 giây, xóa dữ liệu cũ trong localStorage
    if (time <= 60) {
      localStorage.removeItem("lastVideo");
    }
  }
}

function renderSubtitleList() {
  const subtitleList = document.getElementById("subtitleList");
  subtitleList.innerHTML = "";
  subtitles.forEach((sub) => {
    const div = document.createElement("div");
    div.className = "subtitle-item";
    div.textContent = sub.text;
    div.dataset.start = sub.start;
    subtitleList.appendChild(div);
  });
}

function highlightActiveSubtitle(activeSub) {
  const subtitleItems = document.querySelectorAll(".subtitle-item");
  subtitleItems.forEach((item) => {
    item.classList.remove("active");
    if (activeSub && parseFloat(item.dataset.start) === activeSub.start) {
      item.classList.add("active");

      item.scrollIntoView({ block: "start" });
    }
  });
}

// menu list
function loadVideoList() {
  fetch("videos.json")
    .then((response) => response.json())
    .then((data) => {
      videoData = data;
      renderVideoList();
    })
    .catch(() => {
      console.warn("Không tìm thấy videos.json, sử dụng dữ liệu mặc định.");
      renderVideoList();
    });
}

function renderVideoList() {
  const playlistContainer = document.getElementById("playlistGrid");
  playlistContainer.innerHTML = "";

  const groupedVideos = videoData.reduce((acc, video) => {
    if (!acc[video.name]) {
      acc[video.name] = [];
    }
    acc[video.name].push(video);
    return acc;
  }, {});

  Object.keys(groupedVideos).forEach((name) => {
    const nameItem = document.createElement("div");
    nameItem.classList.add("name-item");
    // Lấy video đầu tiên trong group
    const firstVideoId = groupedVideos[name][0].videoId;

    // Lấy thumnbail cần thêm với img và h3 chứa tên group
    const thumbnailImage = `<img src="https://img.youtube.com/vi/${firstVideoId}/mqdefault.jpg" alt="${name} thumbnail" loading="lazy">`;

    // Thêm html với img và h3 chứa tên group
    const nameItemHeader = document.createElement("div");
    nameItemHeader.classList.add("name-item-header");
    nameItemHeader.innerHTML = `${thumbnailImage}<h3>${name}</h3><div class="name-item-arrow">▼</div>`;
    nameItem.appendChild(nameItemHeader);

    const videoList = document.createElement("div");
    videoList.classList.add("video-list");

    groupedVideos[name].forEach((video) => {
      const videoItem = document.createElement("div");
      videoItem.classList.add("video-item");
      videoItem.innerHTML = `
        <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}">
        <p class="video-ep">[${video.name}] #${video.ep}</p>
        <p class="video-title"> <span>${video.titleVi}</span> | <span>${video.title}</span></p>
      `;
      videoItem.addEventListener("click", () => {
        const furiganaToggle = document.getElementById("furiganaToggle");
        furiganaToggle.checked = false;
        loadVideo(video.videoId, video.subtitleFile);
        closeMenu();
      });

      videoList.appendChild(videoItem);
    });

    nameItem.appendChild(videoList);
    playlistContainer.appendChild(nameItem);

    nameItem.addEventListener("click", (event) => {
      videoList.classList.toggle("show");

      // Chỉ thay đổi mũi tên của phần tử hiện tại
      const arrow = nameItemHeader.querySelector(".name-item-arrow"); // Chọn mũi tên của phần tử này

      // Kiểm tra nếu videoList có class 'show' hay không
      if (videoList.classList.contains("show")) {
        arrow.textContent = "▲"; // Nếu có, đổi thành ▲
      } else {
        arrow.textContent = "▼"; // Nếu không, đổi thành ▼
      }
    });
  });

  const emptyDiv = document.createElement("div");
  emptyDiv.classList.add("name-item-empty");
  playlistContainer.appendChild(emptyDiv);
}

/* ==================== Menu Hamburger ==================== */
function setupMenuToggle() {
  const menuToggle = document.getElementById("menuToggle");
  const playlistMenu = document.getElementById("playlistMenu");
  const menuOverlay = document.getElementById("menuOverlay");
  const closeMenuBtn = document.getElementById("closeMenu");

  menuToggle.addEventListener("click", () => {
    playlistMenu.classList.add("active");
    menuOverlay.style.display = "block";
  });

  closeMenuBtn.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", closeMenu);
}

function closeMenu() {
  document.getElementById("playlistMenu").classList.remove("active");
  document.getElementById("menuOverlay").style.display = "none";
}

async function furiganaSubtitleList() {
  const subtitleList = document.getElementById("subtitleList");
  const furiganaToggle = document.getElementById("furiganaToggle");
  subtitleList.innerHTML = "";

  const furiganaEnabled = furiganaToggle.checked;

  // Tạm dừng video trước khi xử lý Furigana
  if (player && player.pauseVideo) {
    player.pauseVideo();
  }

  if (!furiganaEnabled) {
    // Nếu Furigana bị tắt, chỉ hiển thị văn bản gốc
    for (const sub of subtitles) {
      const div = document.createElement("div");
      div.className = "subtitle-item";
      div.dataset.start = sub.start;
      div.innerHTML = sub.text;
      subtitleList.appendChild(div);
    }

    // Tiếp tục phát video nếu Furigana bị tắt
    if (player && player.playVideo) {
      player.playVideo();
    }
    return;
  }

  // Hiển thị thông báo "Đang xử lý Furigana..."
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "loading-message";
  loadingMessage.innerHTML = "⏳ Đang xử lý Furigana, vui lòng chờ...";
  loadingMessage.style.color = "#255F38";
  loadingMessage.style.marginTop = "20px";
  loadingMessage.style.textAlign = "center";
  subtitleList.appendChild(loadingMessage);

  // // Hiển thị với message mặc định
  // handleLoadingModal();

  try {
    // Khởi tạo Kuroshiro để xử lý Furigana
    const kuroshiro = Kuroshiro.default
      ? new Kuroshiro.default()
      : new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "./dict/" }));

    // Xóa thông báo loading
    subtitleList.innerHTML = "";

    // Xử lý từng dòng phụ đề ngay sau khi convert xong
    for (const sub of subtitles) {
      const div = document.createElement("div");
      div.className = "subtitle-item";
      div.dataset.start = sub.start;
      div.innerHTML = sub.text; // Hiển thị nội dung gốc tạm thời
      subtitleList.appendChild(div);

      // Xử lý Furigana từng dòng và cập nhật ngay sau khi hoàn tất
      kuroshiro
        .convert(sub.text, { mode: "furigana", to: "hiragana" })
        .then((furiganaText) => {
          div.innerHTML = furiganaText;
        })
        .catch((err) => {
          console.error("Lỗi khi xử lý Furigana:", err);
          div.innerHTML = `<span style="color:red;">⚠️ Lỗi Furigana</span>`;
        });
    }

    // // Ẩn modal đi
    // handleLoadingModal("", false);

    // Tiếp tục phát video
    if (player && player.playVideo) {
      player.playVideo();
    }
  } catch (error) {
    console.error("Lỗi khi tải Furigana:", error);
    subtitleList.innerHTML =
      "<div class='error-message'>⚠️ Lỗi khi tải Furigana!</div>";
  }
}

/**
 * Hiển thị hoặc ẩn loading modal
 * @param {string} message - Nội dung thông báo
 * @param {boolean} show - true để hiển thị, false để ẩn
 */
// Cách sử dụng:
// Hiển thị modal với message mặc định
// handleLoadingModal();
// Hiển thị modal với message tuỳ chỉnh
// handleLoadingModal("Đang tải dữ liệu...", true);
// Ẩn modal
// handleLoadingModal("", false);
function handleLoadingModal(
  message = "⏳ Đang xử lý, vui lòng chờ...",
  show = true
) {
  // Kiểm tra modal đã tồn tại chưa
  const existingModal = document.getElementById("loadingModal");

  // Nếu yêu cầu hiển thị
  if (show) {
    // Nếu modal đã tồn tại thì chỉ cập nhật nội dung
    if (existingModal) {
      const messageElement = existingModal.querySelector(".modal-message");
      if (messageElement) {
        messageElement.textContent = message;
      }
      return;
    }

    // Tạo modal mới nếu chưa tồn tại
    const loadingModalHTML = `
      <div class="modal fade" id="loadingModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
          <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                  <div class="modal-body text-center py-4">
                      <div class="spinner-border text-success mb-3" role="status">
                          <span class="visually-hidden">Loading...</span>
                      </div>
                      <h5 class="text-success modal-message">${message}</h5>
                  </div>
              </div>
          </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", loadingModalHTML);
    const modal = new bootstrap.Modal(document.getElementById("loadingModal"));
    modal.show();
  }
  // Nếu yêu cầu ẩn
  else {
    if (existingModal) {
      const modal = bootstrap.Modal.getInstance(existingModal);
      if (modal) {
        modal.hide();
        // Xóa modal sau khi ẩn
        existingModal.addEventListener("hidden.bs.modal", () => {
          existingModal.remove();
        });
      } else {
        existingModal.remove();
      }
    }
  }
}

// Ngừng chuột phải (context menu)
document.addEventListener("contextmenu", function (e) {
  e.preventDefault(); // Ngừng trình đơn chuột phải
});

// Ngừng sao chép (copy)
document.addEventListener("copy", function (e) {
  e.preventDefault(); // Ngừng sao chép
});

// Ngừng cắt (cut) nếu cần
document.addEventListener("cut", function (e) {
  e.preventDefault(); // Ngừng cắt
});

// Ngừng kéo chuột trái để bôi đen
document.addEventListener("mousedown", function (e) {
  if (e.button === 2) {
    e.preventDefault(); // Nếu bấm chuột phải, ngừng hành động
  }
});

///////////////////////////////////////////////
//////////////// Toolbar //////////////////////
///////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
  // nút repeat trong phần toolbar
  const repeatBtn = document.getElementById("repeatBtn");
  if (repeatBtn) {
    repeatBtn.addEventListener("click", toggleRepeatMode);
  }
  MultipleBtnClick();
});

let isMicroMode = false;
let isAutoMode = false;
let isRepeatMode = false;
let repeatInterval = null;
let currentRepeatRange = null;

///////////////////////////////////////////////
//////////////// Repeat ///////////////////////
///////////////////////////////////////////////
function toggleRepeatMode() {
  const repeatBtn = document.getElementById("repeatBtn");
  if (!repeatBtn) return;

  isRepeatMode = !isRepeatMode;

  if (isRepeatMode) {
    // Bật chế độ lặp lại
    repeatBtn.style.color = "#9EDE73";
    activateRepeatMode();
  } else {
    // Tắt chế độ lặp lại
    repeatBtn.style.color = "white";
    deactivateRepeatMode();
  }
}

function activateRepeatMode() {
  // Tìm phụ đề hiện tại
  const currentTime = player.getCurrentTime();
  let targetSub = subtitles.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Nếu không có phụ đề hiện tại, tìm phụ đề trước đó
  if (!targetSub) {
    targetSub = subtitles
      .slice()
      .reverse()
      .find((s) => s.end <= currentTime);
  }

  // Nếu vẫn không có, dùng phụ đề đầu tiên
  if (!targetSub && subtitles.length > 0) {
    targetSub = subtitles[0];
  }

  if (targetSub) {
    currentRepeatRange = { start: targetSub.start, end: targetSub.end };
    startRepeating();
  }
}

function startRepeating() {
  if (repeatInterval) clearInterval(repeatInterval);

  // Bắt đầu từ đầu đoạn
  player.seekTo(currentRepeatRange.start, true);

  // Kiểm tra mỗi 500ms
  repeatInterval = setInterval(() => {
    const currentTime = player.getCurrentTime();
    if (currentTime >= currentRepeatRange.end) {
      player.seekTo(currentRepeatRange.start, true);
    }
  }, 500);
}

function deactivateRepeatMode() {
  if (repeatInterval) {
    clearInterval(repeatInterval);
    repeatInterval = null;
  }
  currentRepeatRange = null;
}

///////////////////////////////////////////////
//////////////// Micro Auto ///////////////////
///////////////////////////////////////////////
function MultipleBtnClick() {
  const microphoneBtn = document.getElementById("microphoneBtn");
  const toolbarContentMicro = document.querySelector(
    ".toolbar-content-microphoneBtn"
  );
  const subMicroButtons = [
    document.getElementById("subPlayBtn"),
    document.getElementById("subMicrophoneBtn"),
    document.getElementById("subListenBtn"),
  ];

  const autoBtn = document.getElementById("autoBtn");
  const toolbarContentAuto = document.querySelector(".toolbar-content-autoBtn");
  const subAutoButtons = [
    document.getElementById("subAutoPlayBtn"),
    document.getElementById("subAutoPlayVideoBtn"),
    document.getElementById("subAutoMicrophoneBtn"),
    document.getElementById("subAutoListenBtn"),
  ];

  let isMicroSubButtonsVisible = false;
  let isAutoSubButtonsVisible = false;

  // nhấn nút Micro
  microphoneBtn.addEventListener("click", function () {
    isMicroSubButtonsVisible = !isMicroSubButtonsVisible;

    // Ẩn các nút Auto phụ với hiệu ứng
    isAutoMode = false;
    isAutoSubButtonsVisible = false;
    subAutoButtons.forEach((btn) => {
      btn.style.visibility = "hidden";
      btn.style.opacity = "0";
    });
    toolbarContentAuto.style.backgroundColor = "rgba(37, 95, 56, 0)";
    autoBtn.querySelector("svg").style.fill = "white";

    if (isMicroSubButtonsVisible) {
      // Hiển thị các nút phụ với hiệu ứng
      isMicroMode = true;
      subMicroButtons.forEach((btn) => {
        btn.style.visibility = "visible";
        btn.style.opacity = "1";
      });
      toolbarContentMicro.style.backgroundColor = "rgba(37, 95, 56, 0.4)";
      microphoneBtn.querySelector("svg").style.fill = "#9EDE73";
    } else {
      // Ẩn các nút Micro phụ với hiệu ứng
      isMicroMode = false;
      subMicroButtons.forEach((btn) => {
        btn.style.visibility = "hidden";
        btn.style.opacity = "0";
      });
      toolbarContentMicro.style.backgroundColor = "rgba(37, 95, 56, 0)";
      microphoneBtn.querySelector("svg").style.fill = "white";
    }

    // cập nhật trạng thái nút lặp lại
    updateRepeateState();
  });

  // nhấn nút Auto
  autoBtn.addEventListener("click", function () {
    isAutoSubButtonsVisible = !isAutoSubButtonsVisible;

    // Ẩn các nút Micro phụ với hiệu ứng
    isMicroMode = false;
    isMicroSubButtonsVisible = false;
    subMicroButtons.forEach((btn) => {
      btn.style.visibility = "hidden";
      btn.style.opacity = "0";
    });
    toolbarContentMicro.style.backgroundColor = "rgba(37, 95, 56, 0)";
    microphoneBtn.querySelector("svg").style.fill = "white";

    if (isAutoSubButtonsVisible) {
      // Hiển thị các nút Auto phụ với hiệu ứng
      isAutoMode = true;
      subAutoButtons.forEach((btn) => {
        btn.style.visibility = "visible";
        btn.style.opacity = "1";
      });
      toolbarContentAuto.style.backgroundColor = "rgba(37, 95, 56, 0.4)";
      autoBtn.querySelector("svg").style.fill = "#9EDE73";
    } else {
      // Ẩn các nút Auto phụ với hiệu ứng
      isAutoMode = false;
      subAutoButtons.forEach((btn) => {
        btn.style.visibility = "hidden";
        btn.style.opacity = "0";
      });
      toolbarContentAuto.style.backgroundColor = "rgba(37, 95, 56, 0)";
      autoBtn.querySelector("svg").style.fill = "white";
    }

    // cập nhật trạng thái nút lặp lại
    updateRepeateState();
  });

  // Ẩn các nút Micro phụ ban đầu nhưng vẫn giữ vị trí
  subMicroButtons.forEach((btn) => {
    btn.style.visibility = "hidden";
    btn.style.opacity = "0";
  });

  // Ẩn các nút Auto phụ ban đầu nhưng vẫn giữ vị trí
  subAutoButtons.forEach((btn) => {
    btn.style.visibility = "hidden";
    btn.style.opacity = "0";
  });
}

// cập nhật trạng thái nút lặp lại
function updateRepeateState() {
  const repeatBtn = document.getElementById("repeatBtn");
  if (isMicroMode || isAutoMode) {
    // Tắt chế độ lặp lại
    isRepeatMode = false;
    repeatBtn.style.color = "white";
    repeatBtn.style.visibility = "hidden";
    repeatBtn.style.opacity = "0";
    deactivateRepeatMode();
  } else {
    repeatBtn.style.visibility = "visible";
    repeatBtn.style.opacity = "1";
  }
}

///////////////////////////////////////////////
//////////////// Sub button ///////////////////
///////////////////////////////////////////////
// Gọi hàm setup khi DOM tải xong
document.addEventListener("DOMContentLoaded", function () {
  setupPlayButton();
});

let isVideoPlaying = false;
// Hàm cập nhật nút play/pause
function updatePlayButton() {
  const subPlayBtn = document.getElementById("subPlayBtn");
  const subAutoPlayBtn = document.getElementById("subAutoPlayBtn");
  if (!subPlayBtn) return;

  if (isVideoPlaying) {
    // Nếu video đang phát, hiển thị icon pause
    subPlayBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
        <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5"/>
      </svg>
    `;
    subAutoPlayBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>
    </svg>
  `;
  } else {
    // Nếu video đang dừng, hiển thị icon play
    subPlayBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
        <path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z"/>
      </svg>
    `;
    subAutoPlayBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
      </svg>
    `;
  }
}

// Thêm sự kiện cho nút subPlayBtn
function setupPlayButton() {
  const subPlayBtn = document.getElementById("subPlayBtn");
  const subAutoPlayBtn = document.getElementById("subAutoPlayBtn");
  if (!subPlayBtn) return;
  if (!subAutoPlayBtn) return;

  subPlayBtn.addEventListener("click", function () {
    if (isVideoPlaying) {
      // Nếu đang phát thì dừng
      player.pauseVideo();
    } else {
      // Nếu đang dừng thì phát
      player.playVideo();
    }
  });

  subAutoPlayBtn.addEventListener("click", function () {
    if (isVideoPlaying) {
      // Nếu đang phát thì dừng
      player.pauseVideo();
    } else {
      // Nếu đang dừng thì phát
      player.playVideo();
    }
  });
}
