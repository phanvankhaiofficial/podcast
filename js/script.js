let player;
let videoData = [
  {
    name: "HaruAki",
    id: "1",
    title: "Hướng Dẫn Sử Dụng App Luyện Podcast Song Ngữ HaruAki Nihongo",
    videoId: "6ECd2VLKUho",
    subtitleFile: "",
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
let isProgrammaticSeek = false;

function onPlayerReady(event) {
  setInterval(updateSubtitle, 500);

  setInterval(updateLikeButton, 500);

  // Thêm listener cho trạng thái player
  event.target.addEventListener("onStateChange", function (e) {
    // nếu chuyển bằng nút repeat hoặc nút skip
    if (isProgrammaticSeek) {
      isProgrammaticSeek = false;
      return;
    }
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

// function renderVideoList() {
//   const playlistContainer = document.getElementById("playlistGrid");
//   playlistContainer.innerHTML = "";

//   const groupedVideos = videoData.reduce((acc, video) => {
//     if (!acc[video.name]) {
//       acc[video.name] = [];
//     }
//     acc[video.name].push(video);
//     return acc;
//   }, {});

//   Object.keys(groupedVideos).forEach((name) => {
//     const nameItem = document.createElement("div");
//     nameItem.classList.add("name-item");
//     // Lấy video đầu tiên trong group
//     const firstVideoId = groupedVideos[name][0].videoId;

//     // Lấy thumnbail cần thêm với img và h3 chứa tên group
//     const thumbnailImage = `<img src="https://img.youtube.com/vi/${firstVideoId}/mqdefault.jpg" alt="${name} thumbnail" loading="lazy">`;

//     // Thêm html với img và h3 chứa tên group
//     const nameItemHeader = document.createElement("div");
//     nameItemHeader.classList.add("name-item-header");
//     nameItemHeader.innerHTML = `${thumbnailImage}<h3>${name}</h3><div class="name-item-arrow">▼</div>`;
//     nameItem.appendChild(nameItemHeader);

//     const videoList = document.createElement("div");
//     videoList.classList.add("video-list");

//     groupedVideos[name].forEach((video) => {
//       const videoItem = document.createElement("div");
//       videoItem.classList.add("video-item");
//       videoItem.innerHTML = `
//         <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}">
//         <p class="video-ep">[${video.name}] #${video.ep}</p>
//         <p class="video-title"> <span>${video.titleVi}</span> | <span>${video.title}</span></p>
//       `;
//       videoItem.addEventListener("click", () => {
//         const furiganaToggle = document.getElementById("furiganaToggle");
//         furiganaToggle.checked = false;
//         loadVideo(video.videoId, video.subtitleFile);
//         closeMenu();
//       });

//       videoList.appendChild(videoItem);
//     });

//     nameItem.appendChild(videoList);
//     playlistContainer.appendChild(nameItem);

//     nameItem.addEventListener("click", (event) => {
//       videoList.classList.toggle("show");

//       // Chỉ thay đổi mũi tên của phần tử hiện tại
//       const arrow = nameItemHeader.querySelector(".name-item-arrow"); // Chọn mũi tên của phần tử này

//       // Kiểm tra nếu videoList có class 'show' hay không
//       if (videoList.classList.contains("show")) {
//         arrow.textContent = "▲"; // Nếu có, đổi thành ▲
//       } else {
//         arrow.textContent = "▼"; // Nếu không, đổi thành ▼
//       }
//     });
//   });

//   const emptyDiv = document.createElement("div");
//   emptyDiv.classList.add("name-item-empty");
//   playlistContainer.appendChild(emptyDiv);
// }

function renderVideoList() {
  const playlistContainer = document.getElementById("playlistGrid");
  playlistContainer.innerHTML = "";
  let videoLevel;
  let videoLevelClass;

  // 1. Lấy danh sách video yêu thích từ localStorage
  const likedVideos = JSON.parse(localStorage.getItem("likedVideos")) || [];

  // 2. Nếu có video yêu thích, render chúng trước
  if (likedVideos.length > 0) {
    const likedGroup = document.createElement("div");
    likedGroup.classList.add("name-item");

    // Lấy video đầu tiên trong danh sách yêu thích
    const firstLikedVideo = likedVideos[0];
    const likedHeader = document.createElement("div");
    likedHeader.classList.add("name-item-header");
    likedHeader.innerHTML = `
      <img src="https://img.youtube.com/vi/${firstLikedVideo.videoId}/mqdefault.jpg" alt="Đã lưu" loading="lazy">
      <h3>❤️ Yêu thích</h3>
      <div class="name-item-arrow">▼</div>
    `;
    likedGroup.appendChild(likedHeader);

    const likedVideoList = document.createElement("div");
    likedVideoList.classList.add("video-list"); // Mở sẵn danh sách yêu thích

    likedVideos.forEach((video) => {
      const videoItem = document.createElement("div");

      if (video.level === "1") {
        videoLevelClass = "level-so-cap";
        videoLevel = "N5~N4";
      } else if (video.level === "2") {
        videoLevelClass = "level-trung-cap";
        videoLevel = "N4~N3~N2";
      } else if (video.level === "3") {
        videoLevelClass = "level-thuong-cap";
        videoLevel = "N2~N1";
      } else {
        videoLevelClass = "level-none";
        videoLevel = "";
      }

      videoItem.classList.add("video-item");
      videoItem.innerHTML = `
        <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}">
        <p class="video-ep">[${video.name}] #${video.ep}</p>
        <p class="video-title"><span>${video.titleVi}</span> | <span>${video.title}</span></p>
        <div class="video-level ${videoLevelClass} d-flex align-items-center justify-content-center"><span>${videoLevel}</span></div>
      `;
      videoItem.addEventListener("click", () => {
        const furiganaToggle = document.getElementById("furiganaToggle");
        furiganaToggle.checked = false;
        loadVideo(video.videoId, video.subtitleFile);
        closeMenu();
      });
      likedVideoList.appendChild(videoItem);
    });

    likedGroup.appendChild(likedVideoList);
    playlistContainer.appendChild(likedGroup);

    // Thêm sự kiện toggle cho nhóm yêu thích
    likedHeader.addEventListener("click", (event) => {
      likedVideoList.classList.toggle("show");
      const arrow = likedHeader.querySelector(".name-item-arrow");
      arrow.textContent = likedVideoList.classList.contains("show") ? "▲" : "▼";
    });
  }

  // 3. Render các video khác từ JSON như cũ
  const groupedVideos = videoData.reduce((acc, video) => {
    if (!acc[video.name]) {
      acc[video.name] = [];
    }
    acc[video.name].push(video);
    return acc;
  }, {});

  Object.keys(groupedVideos).forEach((name) => {
    // ... (giữ nguyên phần render các video khác như code gốc)
    const nameItem = document.createElement("div");
    nameItem.classList.add("name-item");
    const firstVideoId = groupedVideos[name][0].videoId;

    const nameItemHeader = document.createElement("div");
    nameItemHeader.classList.add("name-item-header");
    nameItemHeader.innerHTML = `
      <img src="https://img.youtube.com/vi/${firstVideoId}/mqdefault.jpg" alt="${name} thumbnail" loading="lazy">
      <h3>${name}</h3>
      <div class="name-item-arrow">▼</div>
    `;
    nameItem.appendChild(nameItemHeader);

    const videoList = document.createElement("div");
    videoList.classList.add("video-list");

    groupedVideos[name].forEach((video) => {
      const videoItem = document.createElement("div");

      if (video.level === "1") {
        videoLevelClass = "level-so-cap";
        videoLevel = "N5~N4";
      } else if (video.level === "2") {
        videoLevelClass = "level-trung-cap";
        videoLevel = "N4~N3~N2";
      } else if (video.level === "3") {
        videoLevelClass = "level-thuong-cap";
        videoLevel = "N2~N1";
      } else {
        videoLevelClass = "level-none";
        videoLevel = "";
      }

      videoItem.classList.add("video-item");
      videoItem.innerHTML = `
        <img src="https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg" alt="${video.title}">
        <p class="video-ep">[${video.name}] #${video.ep}</p>
        <p class="video-title"><span>${video.titleVi}</span> | <span>${video.title}</span></p>
        <div class="video-level ${videoLevelClass} d-flex align-items-center justify-content-center"><span>${videoLevel}</span></div>
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
      const arrow = nameItemHeader.querySelector(".name-item-arrow");
      arrow.textContent = videoList.classList.contains("show") ? "▲" : "▼";
    });
  });

  // const emptyDiv = document.createElement("div");
  // emptyDiv.classList.add("name-item-empty");
  // playlistContainer.appendChild(emptyDiv);
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
    renderVideoList();
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

document.addEventListener("dblclick", function (event) {
  event.preventDefault();
});

document.addEventListener(
  "touchstart",
  function (event) {
    if (event.detail > 1) {
      event.preventDefault(); // Ngăn double-tap trên mobile
    }
  },
  { passive: false }
);

///////////////////////////////////////////////
//////////////// Toolbar //////////////////////
///////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
  // nút repeat trong phần toolbar
  const repeatBtn = document.getElementById("toolbarRepeatBtn");
  if (repeatBtn) {
    repeatBtn.addEventListener("click", toggleRepeatMode);
  }
});

let isRepeatMode = false;
let repeatInterval = null;
let currentRepeatRange = null;

///////////////////////////////////////////////
//////////////// Repeat ///////////////////////
///////////////////////////////////////////////
function toggleRepeatMode() {
  const repeatBtn = document.getElementById("toolbarRepeatBtn");
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

  // bật cờ repeat
  isProgrammaticSeek = true;

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
//////////////// Play button //////////////////
///////////////////////////////////////////////
// Gọi hàm setup khi DOM tải xong
document.addEventListener("DOMContentLoaded", function () {
  setupPlayButton();
});

let isVideoPlaying = false;
// Hàm cập nhật nút play/pause
function updatePlayButton() {
  const subPlayBtn = document.getElementById("toolbarPlayBtn");
  if (!subPlayBtn) return;

  if (isVideoPlaying) {
    // Nếu video đang phát, hiển thị icon pause
    subPlayBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>
    </svg>
  `;
  } else {
    // Nếu video đang dừng, hiển thị icon play
    subPlayBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
      </svg>
    `;
  }
}

// Thêm sự kiện cho nút subPlayBtn
function setupPlayButton() {
  const subPlayBtn = document.getElementById("toolbarPlayBtn");
  if (!subPlayBtn) return;

  subPlayBtn.addEventListener("click", function () {
    if (isVideoPlaying) {
      // Nếu đang phát thì dừng
      player.pauseVideo();
    } else {
      // Nếu đang dừng thì phát
      player.playVideo();
    }
  });
}

///////////////////////////////////////////////
//////////////// Skip button //////////////////
///////////////////////////////////////////////
// Thêm vào hàm DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  setupSkipBackButton();
  setupSkipNextButton();
});
// Thêm sự kiện cho nút back
function setupSkipBackButton() {
  const skipBackBtn = document.getElementById("toolbarSkipBackBtn");
  if (!skipBackBtn) return;

  skipBackBtn.addEventListener("click", function () {
    if (
      !player ||
      !player.getCurrentTime ||
      !subtitles ||
      subtitles.length === 0
    )
      return;

    const currentTime = player.getCurrentTime();

    // Tìm subtitle hiện tại hoặc subtitle gần nhất đã qua
    let currentSubIndex = -1;
    for (let i = 0; i < subtitles.length; i++) {
      if (
        currentTime >= subtitles[i].start &&
        currentTime <= subtitles[i].end
      ) {
        currentSubIndex = i;
        break;
      }
      if (currentTime < subtitles[i].start) {
        currentSubIndex = i - 1;
        break;
      }
    }

    // Nếu không tìm thấy (cuối video), dùng subtitle cuối cùng
    if (currentSubIndex === -1 && subtitles.length > 0) {
      currentSubIndex = subtitles.length - 1;
    }

    // Xác định thời điểm cần nhảy đến
    let seekTime;
    if (currentSubIndex > 0) {
      // Nhảy về subtitle trước đó
      seekTime = subtitles[currentSubIndex - 1].start;
    } else {
      // Nhảy về đầu video
      seekTime = 0;
    }

    // bật cờ skip
    isProgrammaticSeek = true;
    // kiểm tra có phải đang ở repeat mode không
    if (isRepeatMode) {
      // tắt repeat
      deactivateRepeatMode();

      // Thực hiện seek
      player.seekTo(seekTime, true);

      // bật lại repeat
      setTimeout(() => {
        activateRepeatMode();
      }, 1000); // Chờ 1 giây
    } else {
      // Thực hiện seek
      player.seekTo(seekTime, true);
    }
  });
}
// // Thêm sự kiện cho nút next
// function setupSkipNextButton() {
//   const skipNextBtn = document.getElementById("toolbarSkipNextBtn");
//   if (!skipNextBtn) return;

//   skipNextBtn.addEventListener("click", function () {
//     if (
//       !player ||
//       !player.getCurrentTime ||
//       !subtitles ||
//       subtitles.length === 0
//     )
//       return;

//     const currentTime = player.getCurrentTime();

//     // Tìm subtitle hiện tại hoặc subtitle tiếp theo
//     let currentSubIndex = -1;
//     for (let i = 0; i < subtitles.length; i++) {
//       if (
//         currentTime >= subtitles[i].start &&
//         currentTime <= subtitles[i].end
//       ) {
//         currentSubIndex = i;
//         break;
//       }
//       if (currentTime < subtitles[i].start) {
//         currentSubIndex = i - 1;
//         break;
//       }
//     }

//     // Xác định thời điểm cần nhảy đến
//     let seekTime;
//     if (currentSubIndex < subtitles.length - 1) {
//       // Nhảy đến subtitle tiếp theo
//       seekTime = subtitles[currentSubIndex + 1].start;
//     } else {
//       // Nếu đang ở subtitle cuối cùng, nhảy đến cuối video
//       seekTime = player.getDuration();
//     }

//     // bật cờ skip
//     isProgrammaticSeek = true;
//     // kiểm tra có phải đang ở repeat mode không
//     if (isRepeatMode) {
//       // tắt repeat
//       deactivateRepeatMode();

//       // Thực hiện seek
//       player.seekTo(seekTime, true);

//       // bật lại repeat
//       setTimeout(() => {
//         activateRepeatMode();
//       }, 1000); // Chờ 1 giây
//     } else {
//       // Thực hiện seek
//       player.seekTo(seekTime, true);
//     }
//   });
// }

function setupSkipNextButton() {
  const skipNextBtn = document.getElementById("toolbarSkipNextBtn");
  if (!skipNextBtn) return;

  skipNextBtn.addEventListener("click", async function () {
    // Kiểm tra điều kiện cơ bản
    if (
      !player ||
      !player.getCurrentTime ||
      !subtitles ||
      subtitles.length === 0
    ) {
      return;
    }

    // Đảm bảo player đã sẵn sàng
    if (player.getPlayerState() === YT.PlayerState.UNSTARTED) {
      player.playVideo(); // Bắt đầu phát nếu chưa bắt đầu
      await new Promise((resolve) => setTimeout(resolve, 300)); // Chờ player khởi tạo
    }

    // Lấy thời gian hiện tại chính xác hơn
    const currentTime = player.getCurrentTime();

    let currentSubIndex = -1;
    for (let i = 0; i < subtitles.length; i++) {
      if (
        currentTime >= subtitles[i].start &&
        currentTime <= subtitles[i].end
      ) {
        currentSubIndex = i;
        break;
      }
      if (currentTime < subtitles[i].start) {
        currentSubIndex = i - 1;
        break;
      }
    }

    // Xử lý khi không tìm thấy sub phù hợp
    if (currentSubIndex === -1) {
      currentSubIndex = subtitles.length - 1;
    }

    // Tính toán thời điểm cần nhảy
    let seekTime;
    if (currentSubIndex < subtitles.length - 1) {
      seekTime = subtitles[currentSubIndex + 1].start;
    } else {
      seekTime = player.getDuration();
    }

    // Thực hiện seek
    isProgrammaticSeek = true;
    try {
      if (isRepeatMode) {
        deactivateRepeatMode();
        player.seekTo(seekTime, true);
        setTimeout(() => activateRepeatMode(), 1000);
      } else {
        player.seekTo(seekTime, true);
      }

      // Play video nếu đang pause
      if (player.getPlayerState() === YT.PlayerState.PAUSED) {
        setTimeout(() => player.playVideo(), 100);
      }
    } catch (error) {
      console.error("Lỗi khi seek:", error);
    }
  });
}

///////////////////////////////////////////////
//////////////// Like button //////////////////
///////////////////////////////////////////////
// Thêm vào hàm DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  setupLikeButton();
});
// Hàm kiểm tra và cập nhật trạng thái like
function updateLikeButton() {
  const likeBtn = document.getElementById("toolbarLikeBtn");
  if (!likeBtn || !player || !player.getVideoData) return;

  const likedVideos = JSON.parse(localStorage.getItem("likedVideos")) || [];
  const currentVideoId = player.getVideoData().video_id;

  // Kiểm tra xem video hiện tại có trong danh sách like không
  const isLiked = likedVideos.some((video) => video.videoId === currentVideoId);

  if (isLiked) {
    // Video đã được like
    likeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#9EDE73" class="bi bi-bookmark-check-fill" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M2 15.5V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.74.439L8 13.069l-5.26 2.87A.5.5 0 0 1 2 15.5m8.854-9.646a.5.5 0 0 0-.708-.708L7.5 7.793 6.354 6.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z"/>
      </svg>
    `;
  } else {
    // Video chưa được like
    likeBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-bookmark" viewBox="0 0 16 16">
        <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
      </svg>
    `;
  }
}

// Hàm xử lý sự kiện click like
function setupLikeButton() {
  const likeBtn = document.getElementById("toolbarLikeBtn");
  if (!likeBtn) return;

  likeBtn.addEventListener("click", function () {
    const currentVideo = videoData.find(
      (v) => v.videoId === player.getVideoData().video_id
    );
    if (!currentVideo) return;

    const likedVideos = JSON.parse(localStorage.getItem("likedVideos")) || [];
    const currentVideoId = player.getVideoData().video_id;
    const videoIndex = likedVideos.findIndex(
      (video) => video.videoId === currentVideoId
    );

    if (videoIndex !== -1) {
      // Bỏ like nếu đã like trước đó
      likedVideos.splice(videoIndex, 1);
    } else {
      // Thêm video vào danh sách like
      likedVideos.push({
        videoId: currentVideoId,
        subtitleFile: currentVideo.subtitleFile || "",
        title: currentVideo.title || "",
        titleVi: currentVideo.titleVi || "",
        ep: currentVideo.ep || "",
        name: currentVideo.name || "",
        level: currentVideo.level || "",
        likedAt: new Date().toISOString(), // Thêm thời gian like
      });
    }

    // Lưu danh sách mới vào localStorage
    localStorage.setItem("likedVideos", JSON.stringify(likedVideos));

    // Cập nhật giao diện nút like
    updateLikeButton();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const ftMicroBtn = document.getElementById("ftMicroBtn");
  const ftListenBtn = document.getElementById("ftListenBtn");
  let mediaRecorder;
  let audioChunks = [];
  let audioBlob;
  let audioUrl;
  let audio = new Audio();
  let recordingTimer;
  let cleanupTimer;
  let isRecording = false;
  let isPlaying = false;
  let audioContext;
  let gainNode;
  let microphone;
  let audioDestination;
  const amplificationFactor = 2.0;
  let audioContextInitialized = false;

  // SVG
  const micSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-mic-fill" viewBox="0 0 16 16">
      <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z"/>
      <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5"/>
  </svg>`;

  const stopSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="red" class="bi bi-stop-circle-fill" viewBox="0 0 16 16">
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.5 5A1.5 1.5 0 0 0 5 6.5v3A1.5 1.5 0 0 0 6.5 11h3A1.5 1.5 0 0 0 11 9.5v-3A1.5 1.5 0 0 0 9.5 5z"/>
    </svg>`;

  const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-play-circle-fill" viewBox="0 0 16 16">
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814z"/>
  </svg>`;

  const pauseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-pause-circle-fill" viewBox="0 0 16 16">
  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.25 5C5.56 5 5 5.56 5 6.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C7.5 5.56 6.94 5 6.25 5m3.5 0c-.69 0-1.25.56-1.25 1.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C11 5.56 10.44 5 9.75 5"/>
</svg>`;

  // Hàm kiểm tra iOS
  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // Hàm kiểm tra định dạng âm thanh được hỗ trợ
  function getSupportedMimeType() {
    const types = [
      "audio/webm;codecs=opus", // Chrome/Firefox
      "audio/mp4", // Safari
      "audio/wav",
      "audio/ogg;codecs=opus",
    ];

    for (let type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log("Sử dụng định dạng:", type);
        return type;
      }
    }

    console.warn("Không tìm thấy định dạng hỗ trợ, dùng mặc định");
    return ""; // Dùng định dạng mặc định của trình duyệt
  }

  // Khởi tạo AudioContext
  function initAudioContext() {
    if (!audioContextInitialized) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.gain.value = amplificationFactor;
      audioContextInitialized = true;

      if (isIOS() && audioContext.state === "suspended") {
        audioContext.resume().then(() => {
          console.log("AudioContext đã được resume trên iOS");
        });
      }
    }
  }

  // Xử lý sự kiện ghi âm
  ftMicroBtn.addEventListener("click", async function () {
    this.classList.toggle("ftMicroBtn-red");
    this.classList.toggle("ftMicroBtn-white");

    if (!isRecording) {
      // Dừng các hoạt động âm thanh hiện tại
      cleanupRecording();

      // Tạm dừng video nếu có
      if (player && player.pauseVideo) {
        player.pauseVideo();
      }

      try {
        initAudioContext();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // Đảm bảo AudioContext active trên iOS
        if (isIOS() && audioContext.state === "suspended") {
          await audioContext.resume();
        }

        audioDestination = audioContext.createMediaStreamDestination();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(gainNode);
        gainNode.connect(audioDestination);

        // Tạo MediaRecorder với định dạng phù hợp
        const options = {};
        const mimeType = getSupportedMimeType();
        if (mimeType) options.mimeType = mimeType;

        try {
          mediaRecorder = new MediaRecorder(audioDestination.stream, options);
        } catch (e) {
          console.warn(
            "Không thể tạo MediaRecorder với options, thử không dùng options"
          );
          mediaRecorder = new MediaRecorder(audioDestination.stream);
        }

        audioChunks = [];

        mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) {
            audioChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = async function () {
          try {
            const mimeType = mediaRecorder.mimeType || "audio/wav";
            audioBlob = new Blob(audioChunks, { type: mimeType });
            audioUrl = URL.createObjectURL(audioBlob);

            // Tạo audio element mới cho iOS
            audio = new Audio();
            audio.src = audioUrl;
            audio.preload = "auto";

            // Hiển thị nút nghe
            ftListenBtn.classList.remove("hiddenBtn");
            ftListenBtn.classList.add("showBtn");
            ftListenBtn.innerHTML = playSvg;

            resetCleanupTimer();

            if (isIOS()) {
              console.log(
                "Ghi âm thành công. Trên iOS, chạm vào nút Play để nghe lại."
              );
            }
          } catch (error) {
            console.error("Lỗi khi xử lý bản ghi:", error);
            alert("Lỗi khi xử lý bản ghi âm");
          } finally {
            // Giải phóng tài nguyên
            if (microphone) microphone.disconnect();
            if (gainNode) gainNode.disconnect();
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        mediaRecorder.start(100); // Ghi âm theo chunk 100ms
        isRecording = true;
        ftMicroBtn.innerHTML = stopSvg;
        ftMicroBtn.style.color = "red";

        // Giới hạn ghi âm 2 phút
        recordingTimer = setTimeout(stopRecording, 2 * 60 * 1000);
      } catch (error) {
        console.error("Lỗi khi ghi âm:", error);
        alert("Không thể bắt đầu ghi âm: " + error.message);
        stopRecording();
      }
    } else {
      stopRecording();
    }
  });

  // Xử lý phát âm thanh
  ftListenBtn.addEventListener("click", async function () {
    if (!audioUrl) return;

    try {
      // Đảm bảo AudioContext active trên iOS
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
      }

      if (isPlaying) {
        await audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        ftListenBtn.innerHTML = playSvg;
      } else {
        // Tạo audio element mới mỗi lần phát (fix cho iOS)
        const newAudio = new Audio(audioUrl);
        newAudio.preload = "auto";

        newAudio.onended = () => {
          isPlaying = false;
          ftListenBtn.innerHTML = playSvg;
          resetCleanupTimer();
        };

        audio = newAudio;

        await audio.play();
        isPlaying = true;
        ftListenBtn.innerHTML = pauseSvg;
      }

      resetCleanupTimer();
    } catch (error) {
      console.error("Lỗi khi phát âm thanh:", error);

      if (isIOS()) {
        alert(
          "Trên iPhone/iPad:\n1. Chạm giữ vào nút Play 1 giây\n2. Chọn 'Cho phép' nếu có thông báo\n3. Thử phát lại lần nữa"
        );
      } else {
        alert("Không thể phát âm thanh: " + error.message);
      }
    }
  });

  // Dừng ghi âm
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      clearTimeout(recordingTimer);
      isRecording = false;
      ftMicroBtn.innerHTML = micSvg;
      ftMicroBtn.style.color = "white";
    }
  }

  // Reset timer tự động xóa bản ghi
  function resetCleanupTimer() {
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(cleanupRecording, 30 * 1000); // 30 giây
  }

  // Dọn dẹp bản ghi
  function cleanupRecording() {
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      isPlaying = false;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = null;
      audioBlob = null;
      if (audio) audio.src = "";
    }

    ftListenBtn.innerHTML = playSvg;
    ftListenBtn.classList.add("hiddenBtn");
    ftListenBtn.classList.remove("showBtn");
  }

  // Dọn dẹp khi đóng trang
  window.addEventListener("beforeunload", function () {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (audioContext) {
      audioContext.close();
    }
  });
});
// <<<<<<<<<<<<<<<<<<<<< Micro >>>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<< Micro >>>>>>>>>>>>>>>>>>>>>>>>>>>
// <<<<<<<<<<<<<<<<<<<<< Micro >>>>>>>>>>>>>>>>>>>>>>>>>>>
