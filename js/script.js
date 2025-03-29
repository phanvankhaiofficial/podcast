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

// document.addEventListener("DOMContentLoaded", function () {
//   loadVideoList();
//   setupMenuToggle();

//     const furiganaToggle = document.getElementById('furiganaToggle');
  
//   // Thiết lập trạng thái ban đầu từ localStorage
//   furiganaToggle.checked = getFuriganaState();
  
//   // Thêm sự kiện khi toggle thay đổi
//   furiganaToggle.addEventListener('change', async function() {
//     setFuriganaState(this.checked);
//     await furiganaSubtitleList();
//   });
// });

document.addEventListener("DOMContentLoaded", function () {
  loadVideoList();
  setupMenuToggle();

  const furiganaToggle = document.getElementById('furiganaToggle');
  
  // Hàm debounce
  function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Tạo phiên bản debounce của hàm xử lý furigana
  const debouncedFuriganaUpdate = debounce(async (checked) => {
    await furiganaSubtitleList();
  }, 1000); // Đặt delay 300ms (có thể điều chỉnh)

  // Thiết lập trạng thái ban đầu từ localStorage
  furiganaToggle.checked = getFuriganaState();
  
  // Thêm sự kiện khi toggle thay đổi
  furiganaToggle.addEventListener('change', function() {
    // Cập nhật trạng thái ngay lập tức
    setFuriganaState(this.checked);
    
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
        
        // Tạm dừng video trước khi xử lý Furigana
        if (player && player.pauseVideo) {
          player.pauseVideo();
        }
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
        onStateChange: onPlayerStateChange, 
      },
    });
  }

  loadSubtitles(subtitleFile);
  furiganaSubtitleList();
}

let adCheckInterval;
let isAdPlaying = false;

function onPlayerReady(event) {
  setInterval(updateSubtitle, 500);
  startAdChecker(); //  skip ads 
}


////////////////////////////////  skip ads   ///////////////////////////////////
////////////////////////////////  skip ads   ///////////////////////////////////

function onPlayerStateChange(event) {
  // Kiểm tra trạng thái player
  if (event.data === YT.PlayerState.PLAYING) {
    // Nếu đang phát video bình thường
    if (!isAdPlaying) {
      startAdChecker();
    }
  }
}

function startAdChecker() {
  // Dừng interval cũ nếu có
  if (adCheckInterval) {
    clearInterval(adCheckInterval);
  }
  
  // Kiểm tra quảng cáo mỗi 500ms
  adCheckInterval = setInterval(checkForAds, 500);
}

function checkForAds() {
  if (!player) return;

  // Kiểm tra thời gian hiện tại và thời lượng
  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();
  
  // Nếu là quảng cáo (thời lượng thường ngắn < 1 phút)
  if (duration < 60 && currentTime < duration) {
    isAdPlaying = true;
    
    // Tạo nút skip ad (nếu chưa có)
    if (!document.getElementById('customSkipAdBtn')) {
      createSkipAdButton();
    }
    
    // Tự động skip khi còn 1 giây cuối (để chắc chắn)
    if (currentTime >= duration - 1) {
      skipAd();
    }
  } else {
    isAdPlaying = false;
    removeSkipAdButton();
  }
}

function createSkipAdButton() {
  const skipBtn = document.createElement('div');
  skipBtn.id = 'customSkipAdBtn';
  skipBtn.innerHTML = 'Bỏ qua quảng cáo';
  skipBtn.style.position = 'absolute';
  skipBtn.style.bottom = '60px';
  skipBtn.style.right = '20px';
  skipBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
  skipBtn.style.color = 'white';
  skipBtn.style.padding = '8px 12px';
  skipBtn.style.borderRadius = '4px';
  skipBtn.style.cursor = 'pointer';
  skipBtn.style.zIndex = '9999';
  skipBtn.onclick = skipAd;
  
  document.getElementById('player').appendChild(skipBtn);
}

function removeSkipAdButton() {
  const btn = document.getElementById('customSkipAdBtn');
  if (btn) {
    btn.remove();
  }
}

function skipAd() {
  if (player) {
    // Tua đến cuối video (quảng cáo)
    player.seekTo(player.getDuration());
    
    // Dừng kiểm tra quảng cáo tạm thời
    clearInterval(adCheckInterval);
    isAdPlaying = false;
    removeSkipAdButton();
    
    // Sau 2 giây tiếp tục kiểm tra
    setTimeout(startAdChecker, 2000);
  }
}

////////////////////////////////  skip ads   ///////////////////////////////////
////////////////////////////////  skip ads   ///////////////////////////////////

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
    // document.getElementById("subtitle").innerHTML = sub
    //   ? sub.text.replace(/\r\n/g, "<br>")
    //   : "";
    highlightActiveSubtitle(sub);

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

/* ==================== Furigana ==================== */
// let furiganaEnabled = false;

// document
//   .getElementById("furiganaToggle")
//   .addEventListener("click", async function () {
//     furiganaEnabled = !furiganaEnabled;
//     await furiganaSubtitleList();
//   });

// async function furiganaSubtitleList() {
//   const subtitleList = document.getElementById("subtitleList");
//   subtitleList.innerHTML = "";

//   // ✅ Cập nhật trạng thái nút toggle
//   document.getElementById("furiganaToggle").style.textDecoration =
//     furiganaEnabled ? "line-through" : "none";

//   // 🛑 Tạm dừng video trước khi xử lý Furigana
//   if (player && player.pauseVideo) {
//     player.pauseVideo();
//   }

//   if (!furiganaEnabled) {
//     // ❌ Nếu furigana bị tắt, chỉ hiển thị văn bản gốc
//     for (const sub of subtitles) {
//       const div = document.createElement("div");
//       div.className = "subtitle-item";
//       div.dataset.start = sub.start;
//       div.innerHTML = sub.text;

//       subtitleList.appendChild(div);
//     }

//     // ▶️ Tiếp tục phát video nếu đã tắt Furigana
//     if (player && player.playVideo) {
//       player.playVideo();
//     }
//     return;
//   }

//   // ✅ Hiển thị thông báo "Đang xử lý Furigana..."
//   const loadingMessage = document.createElement("div");
//   loadingMessage.className = "loading-message";
//   loadingMessage.innerHTML = "⏳ Đang xử lý Furigana, vui lòng chờ...";
//   loadingMessage.style.color = "#255F38";
//   loadingMessage.style.marginTop = "20px";
//   loadingMessage.style.textAlign = "center";
//   subtitleList.appendChild(loadingMessage);

//   try {
//     // ✅ Nếu furiganaEnabled = true, tiếp tục xử lý furigana
//     const kuroshiro = Kuroshiro.default
//       ? new Kuroshiro.default()
//       : new Kuroshiro();

//     await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "./dict/" }));

//     // ✅ Xóa thông báo loading sau khi hoàn tất
//     subtitleList.innerHTML = "";

//     for (const sub of subtitles) {
//       const div = document.createElement("div");
//       div.className = "subtitle-item";
//       div.dataset.start = sub.start;

//       const furiganaText = await kuroshiro.convert(sub.text, {
//         mode: "furigana",
//         to: "hiragana",
//       });

//       div.innerHTML = furiganaText;

//       subtitleList.appendChild(div);
//     }

//     // ▶️ Tiếp tục phát video sau khi hoàn tất xử lý Furigana
//     if (player && player.playVideo) {
//       player.playVideo();
//     }
//   } catch (error) {
//     console.error("Lỗi khi tải Furigana:", error);
//     subtitleList.innerHTML =
//       "<div class='error-message'>⚠️ Lỗi khi tải Furigana!</div>";
//   }
// }

// async function furiganaSubtitleList() {
//   const subtitleList = document.getElementById("subtitleList");
//   subtitleList.innerHTML = "";

//   // ✅ Cập nhật trạng thái nút toggle
//   document.getElementById("furiganaToggle").style.textDecoration =
//     furiganaEnabled ? "line-through" : "none";

//   // 🛑 Tạm dừng video trước khi xử lý Furigana
//   if (player && player.pauseVideo) {
//     player.pauseVideo();
//   }

//   if (!furiganaEnabled) {
//     // ❌ Nếu Furigana bị tắt, chỉ hiển thị văn bản gốc
//     for (const sub of subtitles) {
//       const div = document.createElement("div");
//       div.className = "subtitle-item";
//       div.dataset.start = sub.start;
//       div.innerHTML = sub.text;
//       subtitleList.appendChild(div);
//     }

//     // ▶️ Tiếp tục phát video nếu Furigana bị tắt
//     if (player && player.playVideo) {
//       player.playVideo();
//     }
//     return;
//   }

//   // ✅ Hiển thị thông báo "Đang xử lý Furigana..."
//   const loadingMessage = document.createElement("div");
//   loadingMessage.className = "loading-message";
//   loadingMessage.innerHTML = "⏳ Đang xử lý Furigana, vui lòng chờ...";
//   loadingMessage.style.color = "#255F38";
//   loadingMessage.style.marginTop = "20px";
//   loadingMessage.style.textAlign = "center";
//   subtitleList.appendChild(loadingMessage);

//   try {
//     // ✅ Khởi tạo Kuroshiro để xử lý Furigana
//     const kuroshiro = Kuroshiro.default
//       ? new Kuroshiro.default()
//       : new Kuroshiro();
//     await kuroshiro.init(new KuromojiAnalyzer({ dictPath: "./dict/" }));

//     // ✅ Xóa thông báo loading
//     subtitleList.innerHTML = "";

//     // ✅ Xử lý từng dòng phụ đề ngay sau khi convert xong
//     for (const sub of subtitles) {
//       const div = document.createElement("div");
//       div.className = "subtitle-item";
//       div.dataset.start = sub.start;
//       div.innerHTML = sub.text; // Hiển thị nội dung gốc tạm thời
//       subtitleList.appendChild(div);

//       // 👉 Xử lý Furigana từng dòng và cập nhật ngay sau khi hoàn tất
//       kuroshiro
//         .convert(sub.text, { mode: "furigana", to: "hiragana" })
//         .then((furiganaText) => {
//           div.innerHTML = furiganaText;
//         })
//         .catch((err) => {
//           console.error("Lỗi khi xử lý Furigana:", err);
//           div.innerHTML = `<span style="color:red;">⚠️ Lỗi Furigana</span>`;
//         });

//       // ▶️ Phát video ngay sau khi dòng đầu tiên được xử lý
//       if (player && player.playVideo && sub === subtitles[0]) {
//         player.playVideo();
//       }
//     }
//   } catch (error) {
//     console.error("Lỗi khi tải Furigana:", error);
//     subtitleList.innerHTML =
//       "<div class='error-message'>⚠️ Lỗi khi tải Furigana!</div>";
//   }
// }

// Hàm kiểm tra trạng thái Furigana từ localStorage
function getFuriganaState() {
  const savedState = localStorage.getItem('furiganaEnabled');
  return savedState === null ? false : savedState === 'true';
}

// Hàm lưu trạng thái Furigana vào localStorage
function setFuriganaState(enabled) {
  localStorage.setItem('furiganaEnabled', enabled);
}

// Khởi tạo toggle switch khi trang được tải
document.addEventListener('DOMContentLoaded', function() {

});

// Sửa lại hàm furiganaSubtitleList để sử dụng giá trị từ localStorage
async function furiganaSubtitleList() {
  const subtitleList = document.getElementById("subtitleList");
  subtitleList.innerHTML = "";

  const furiganaEnabled = getFuriganaState();

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

    // // Tiếp tục phát video nếu Furigana bị tắt
    // if (player && player.playVideo) {
    //   player.playVideo();
    // }
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

      // // Phát video ngay sau khi dòng đầu tiên được xử lý
      // if (player && player.playVideo && sub === subtitles[0]) {
      //   player.playVideo();
      // }
    }
  } catch (error) {
    console.error("Lỗi khi tải Furigana:", error);
    subtitleList.innerHTML =
      "<div class='error-message'>⚠️ Lỗi khi tải Furigana!</div>";
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
