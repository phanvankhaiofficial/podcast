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
});

function onYouTubeIframeAPIReady() {
  loadVideo(videoData[0].videoId, videoData[0].subtitleFile);
}

function loadVideo(videoId, subtitleFile) {
  if (player) {
    player.loadVideoById(videoId);
  } else {
    player = new YT.Player("player", {
      videoId: videoId,
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        disablekb: 1,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    });
  }

  loadSubtitles(subtitleFile);
}

function onPlayerReady(event) {
  setInterval(updateSubtitle, 500);
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
    document.getElementById("subtitle").innerHTML = sub
      ? sub.text.replace(/\r\n/g, "<br>")
      : "";
    highlightActiveSubtitle(sub);
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
    div.addEventListener("click", () => {
      player.seekTo(sub.start, true);
    });
    subtitleList.appendChild(div);
  });
}

function highlightActiveSubtitle(activeSub) {
  const subtitleItems = document.querySelectorAll(".subtitle-item");
  subtitleItems.forEach((item) => {
    item.classList.remove("active");
    if (activeSub && parseFloat(item.dataset.start) === activeSub.start) {
      item.classList.add("active");
    }
  });
}

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
  const playlistContainer = document.getElementById("playlist");
  playlistContainer.innerHTML = "";

  videoData.forEach((video) => {
    const li = document.createElement("li");
    li.textContent = `【${video.name}】＃ ${video.id} ${video.title}`;
    li.addEventListener("click", () => {
      loadVideo(video.videoId, video.subtitleFile);
      closeMenu();
    });
    playlistContainer.appendChild(li);
  });
}

/* ==================== Điều khiển Video ==================== */
document.getElementById("playPause").addEventListener("click", function () {
  if (player.getPlayerState() === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    this.innerHTML = "▶";
  } else {
    player.playVideo();
    this.innerHTML = "⏸";
  }
});

document.getElementById("prevSub").addEventListener("click", function () {
  let time = player.getCurrentTime();
  let prevSub = subtitles.reverse().find((s) => s.start < time);
  subtitles.reverse();
  if (prevSub) player.seekTo(prevSub.start, true);
});

document.getElementById("nextSub").addEventListener("click", function () {
  let time = player.getCurrentTime();
  let nextSub = subtitles.find((s) => s.start > time);
  if (nextSub) player.seekTo(nextSub.start, true);
});

document.getElementById("speed").addEventListener("click", function () {
  let speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  let currentSpeed = player.getPlaybackRate();
  let newSpeed = speeds[(speeds.indexOf(currentSpeed) + 1) % speeds.length];
  player.setPlaybackRate(newSpeed);
  this.innerHTML = `${newSpeed}x`;
});

document.getElementById("muteToggle").addEventListener("click", function () {
  if (player.isMuted()) {
    player.unMute();
    this.innerHTML = "🔈"; // Loa nhỏ (đen)
  } else {
    player.mute();
    this.innerHTML = "🔇"; // Loa tắt tiếng (đen)
  }
});

function onPlayerStateChange(event) {
  const playPauseBtn = document.getElementById("playPause");

  if (event.data === YT.PlayerState.PLAYING) {
    playPauseBtn.innerHTML = "⏸";
  } else if (event.data === YT.PlayerState.PAUSED) {
    playPauseBtn.innerHTML = "▶";
  }
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

/* ==================== Fullscreen ==================== */
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

window.addEventListener("resize", function () {
  if (window.innerWidth > window.innerHeight) {
    toggleFullScreen();
  } else {
    document.exitFullscreen();
  }
});

window.addEventListener("load", function () {
  setTimeout(() => window.scrollTo(0, 0), 100);
});
