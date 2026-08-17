// DOM elements
const albumCover = document.getElementById('album-cover');
const trackName = document.getElementById('track-name');
const artistName = document.getElementById('artist-name');
const albumName = document.getElementById('album-name');
const shuffleBtn = document.getElementById('shuffle-btn');
const prevBtn = document.getElementById('prev-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const nextBtn = document.getElementById('next-btn');
const repeatBtn = document.getElementById('repeat-btn');
const queueContainer = document.getElementById('track-queue-container');
const queueBtn = document.getElementById('queue-btn');
const volSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const progressBar = document.getElementById('progress-bar');
const startTime = document.getElementById('start-time');
const endTime = document.getElementById('end-time');
const shuffleTooltip = document.getElementById('shuffle-tooltip');
const playPauseTooltip = document.getElementById('play-pause-tooltip');
const repeatTooltip = document.getElementById('repeat-tooltip');
const muteTooltip = document.getElementById('mute-tooltip');
const credBtn = document.getElementById('cred-btn');
const credDialog = document.getElementById('cred-dialog');
const closeCred = document.getElementById('close-cred');
const artworkCred = document.getElementById('artwork-cred');
const musicCred = document.getElementById('music-cred');

// DOM svg icons
const playPauseIcon = playPauseBtn.querySelector('.svg');
const repeatIcon = repeatBtn.querySelector('.svg');
const volIcon = muteBtn.querySelector('.svg');

// variables
let tracks = []; // stores array object from json
let index = 0; // tracks index
let isShuffle = false; // tracks if shuffle is selected
let repeatState = 0; // tracks which repeat state is selected
let newTracks = []; // new array for shuffle
let hasPlaybackStarted = false; // tracks if playback has started
let isMute = false; // tracks if mute is selected
let volValue; // stores previous volume value before mute is selected
let progressInterval; // progress bar timer
let isSeeking = false; // tracks if user is seeking through song
let isTrackListOpen = false; // tracks if track list tray is open
let trackQueue; // displays track list when metadata loads
let credQueue; // displays track list when metadata loads
let credData; // stores credits data from json file

// creates audio object
const audio = new Audio();

// input range and audio volume values

volSlider.value = 0.5; // sets default volume
audio.volume = volSlider.value; // adjusts volume of audio
progressBar.value = 0; // sets progress bar

// loads audio
const loadAudio = (track) => {
    audio.src = track.src;
    audio.load();
}

// plays audio, catches errors
const playAudio = async () => {
    try {
        await audio.play();
        hasPlaybackStarted = true;
        updatePlayerUI();
        return true;
    } catch (err) {
        console.error('Playback failed:', err);
        hasPlaybackStarted = false;
        playPauseIcon.src = './assets/svg/play.svg';
        alert('[ netrunner log ] : Playback failed');
        return false;
    }
}

// fetches data from json file
const fetchData = async () => {
    try {
        const res = await fetch('./songs.json');
        const data = await res.json();

        // adds id property to tracks array object
        data.tracks = data.tracks.map((track, index) => ({
            ...track, id: index
        }));

        return data;
    } catch (err) {
        console.error('Failed to load track data:', err);
        alert('[ netrunner log ] : Netdata error');
        return null;
    }
}

// initialises tracks data
const initPlayer = async () => {
    const data = await fetchData();

    if (!data) return;

    // destructures the metadata
    const { tracks: tracksData, credits } = data;
    tracks = tracksData;
    credData = credits;
    
    loadAudio(tracks[index]);

    newTracks = [...tracks];
    trackQueue = displayTrackList();
    displayCred();

    // allows user to play song from track list
    trackQueue.forEach(item => {
        item.addEventListener('click', (e) => trackQueueList(e));
    });
}

initPlayer();


// scrolls current track into view when track queue list is opened
const scrollToCurrentTrack = () => {
    const currentQueue = queueContainer.querySelector('.playing');

    if (currentQueue) {
        queueContainer.scrollTo({
            top: currentQueue.offsetTop -
                queueContainer.offsetTop -
                (queueContainer.clientHeight - currentQueue.offsetHeight) / 2,
            behavior: 'smooth'
        });
    }
}

// updates ui
const displayTrackInfo = (trackInfo) => {

    // displays track info - track name, artist name, album name, album art
    albumCover.src = trackInfo.cover;
    trackName.textContent = trackInfo.title;
    artistName.textContent = trackInfo.artist;
    albumName.textContent = trackInfo.album;

    // highlights current track in track queue tray and scrolls to playing track
    trackQueue.forEach(item => {
        if (Number(item.dataset.type) === trackInfo.id) {
            item.classList.add('playing');
        } else {
            item.classList.remove('playing');
        }
    });

    scrollToCurrentTrack();

    // displays progress bar
    progressBar.style.display = 'block';
}

// updates ui
    const updatePlayerUI = () => {
        const currentTracks = !isShuffle ? tracks : newTracks;

    if (!audio.paused) {
        playPauseIcon.src = './assets/svg/pause.svg';
        playPauseBtn.setAttribute('aria-label', 'pause track');
        playPauseTooltip.textContent = 'Pause [ space ]';
    } else {
        playPauseIcon.src = './assets/svg/play.svg';
        playPauseBtn.setAttribute('aria-label', 'play track');
        playPauseTooltip.textContent = 'Play [ space ]';
    }
    
    displayTrackInfo(currentTracks[index]);
    timeDisplay();
}

// plays previous track
const playPrevTrack = () => {
    const currentTracks = !isShuffle ? tracks : newTracks; // if shuffle is selected, plays from new shuffled tracks
    const wasPlaying = !audio.paused; // logs current state of play/pause

    if (!hasPlaybackStarted) { // if playback has not started, display remains as default
        resetDisplay();
    } else {
        // if first track is playing, first track starts from the beginning
        // if first track is paused, audio loads to the beginning but doesn't play
        if (index === 0 && (repeatState === 0 || repeatState === 2)) {
            audio.currentTime = 0;

            if (wasPlaying) playAudio();
            return;
        }
        
        if (index === 0 && repeatState === 1) {
            index = currentTracks.length - 1;
        } else {
            index--;
        }

        loadAudio(currentTracks[index]);
        
        // if current track is playing, plays previous track else previous track and info is loaded but doesn't play
        if (wasPlaying) {
            playAudio();
        } else {
            displayTrackInfo(currentTracks[index]);
            timeDisplay();
        }
    }
}

// plays next track
const playNextTrack = (forcePlay = false) => {
    const currentTracks = !isShuffle ? tracks : newTracks; // if shuffle is selected, plays from new shuffled tracks
    const wasPlaying = !audio.paused; // logs current state of play/pause

    if (!hasPlaybackStarted) { // if playback has not started, display remains as default
        resetDisplay();
    } else {
        if (index === currentTracks.length - 1) { // if repeat is selected and last track is playing, playback starts from the beginning of playlist
            if (repeatState === 1) {
                index = 0;
            } else {
                return;
            }
        } else {
            index++;
        }

        loadAudio(currentTracks[index]);
        
        // if current track is playing, plays next track else next track and info is loaded but doesn't play
        if (wasPlaying || forcePlay) {
            playAudio();
        } else {
            displayTrackInfo(currentTracks[index]);
            timeDisplay();
        }
    }
}

// creates random shuffle
const shuffleTracks = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// uses random shuffle to shuffle tracks
const shuffle = () => {
    if (!isShuffle) { // if shuffle is selected
        // updates ui
        shuffleBtn.classList.add('active');
        shuffleBtn.setAttribute('aria-label', 'disable shuffle');
        shuffleTooltip.textContent = 'Unshuffle [ s ]';

        let currentId;
        newTracks = [...tracks]; // resets shuffle playlist

        shuffleTracks(newTracks); // shuffles playlist

        if (!hasPlaybackStarted) { // if playback has not started
            const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]; // randomly selects track
            currentId = randomTrack.id; // selects id of random track
        } else { // if playback has started
            currentId = tracks[index].id; // selects id of current track
        }

        index = newTracks.findIndex(t => t.id === currentId); // updates index to id of selected (random or current) track

        const currentTrackObj = newTracks.splice(index, 1); // removes selected track from new shuffled playlist

        // adds removed track at the beginning of new shuffled playlist
        // if shuffle is selected while track is playing, ensures current track becomes first track in new shuffled playlist
        newTracks.unshift(...currentTrackObj);

        index = 0;

        if (!hasPlaybackStarted) { // if playback hasn't started, loads new shuffled playlist
            loadAudio(newTracks[index]);
        }
    } else { // if shuffle is not selected
        // updates ui
        shuffleBtn.classList.remove('active');
        shuffleBtn.setAttribute('aria-label', 'enable shuffle');
        shuffleTooltip.textContent = 'Shuffle [ s ]';
        
        // if shuffle is turned off while current track is playing, ensures default playlist continues from current track
        index = newTracks[index].id;
    }

    isShuffle = !isShuffle;
}

// selects repeat state
const repeat = () => {
    // cycles through no repeat, repeat playlist, repeat current track
    repeatState = (repeatState + 1) % 3;

    // updates ui
    if (repeatState === 0) { // no repeat
        repeatIcon.src = './assets/svg/repeat.svg';
        repeatBtn.classList.remove('active');
        repeatBtn.setAttribute('aria-label', 'enable repeat playlist');
        repeatTooltip.textContent = 'Repeat [ r ]';
    } else if (repeatState === 1) { // repeat playlist
        repeatIcon.src = './assets/svg/repeat.svg';
        repeatBtn.classList.add('active');
        repeatBtn.setAttribute('aria-label', 'enable repeat track');
        repeatTooltip.textContent = 'Repeat Track [ r ]';
    } else if (repeatState === 2) { // repeat current track
        repeatIcon.src = './assets/svg/repeat-one.svg';
        repeatBtn.classList.add('active');
        repeatBtn.setAttribute('aria-label', 'disable repeat');
        repeatTooltip.textContent = 'No Repeat [ r ]';
    }
}

// auto plays next track
const autoPlayTrack = () => {
    const currentTracks = !isShuffle ? tracks : newTracks; // if shuffle is selected, plays from shuffled playlist

    if (repeatState === 2) { // repeats current track
        audio.currentTime = 0;
        playAudio();
    } else if (repeatState === 0 && index === currentTracks.length - 1) { // if no repeat is selected, resets ui to default
        resetDisplay();
    } else {
        playNextTrack(true); // auto plays next track
    }
}

// displays track list
const displayTrackList = () => {
    tracks.forEach(track => {
        queueContainer.innerHTML += `
            <div class="track-queue" data-type="${track.id}">
                <p class="queue-title">${track.title}</p>
                <p class="queue-artist">${track.artist}</p>
            </div>
        `
    });

    return document.querySelectorAll('.track-queue');
}

// lets user select track from track list tray
const trackQueueList = (e) => {
    const currentTracks = !isShuffle ? tracks : newTracks;
    const queueTrack = e.target.closest('.track-queue');
    
    if (!queueTrack) return;

    if (isShuffle) { // if shuffle is selected
        shuffleTracks(currentTracks);
        const currentId = Number(queueTrack.dataset.type); // converts data type of track to number
        index = currentTracks.findIndex(t => t.id === currentId); // updates index to selected id from tracks array
        
        const currentTrackObj = currentTracks.splice(index, 1); // removes selected track from playlist
        currentTracks.unshift(...currentTrackObj); // adds removed track to beginning of playlist so it becomes first track in shuffled playlist

        index = 0;
    } else { // if shuffle is not selected
        index = Number(queueTrack.dataset.type); // updates index to selected track by converting track data type to number
    }

    loadAudio(currentTracks[index]);
    playAudio();
}

// updates volume and volume range ui
const volume = () => {
    audio.volume = parseFloat(volSlider.value); // adjusts audio volume to current slider value, converting to number

    const value = (volSlider.value - volSlider.min) / (volSlider.max - volSlider.min) * 100; // converts volume range value to percentage for ui

    // updates ui
    volSlider.style.setProperty('--volume', `${value}%`);

    if (audio.volume > 0.5) {
        volIcon.src = './assets/svg/volume-high.svg';
    } else if (audio.volume > 0) {
        volIcon.src = './assets/svg/volume-low.svg';
    } else if (audio.volume === 0) {
        volIcon.src = './assets/svg/volume-none.svg';
    }

    if (audio.volume >= 0.01) {
        isMute = false;
        muteBtn.setAttribute('aria-label', 'enable mute');
        muteTooltip.textContent = 'Mute [ m ]';
    }
}

volume();

// updates mute and mute btn ui
const mute = () => {
    if (!isMute) { // if mute is selected
        volValue = parseFloat(volSlider.value); // updates volume range value to value of range, converting to number
        audio.volume = 0;

        // updates ui
        volSlider.value = 0;
        volIcon.src = './assets/svg/volume-mute.svg';
        volSlider.style.setProperty('--volume', '0%');
        muteBtn.setAttribute('aria-label', 'disable mute');
        muteTooltip.textContent = 'Unmute [ m ]';
    } else { // if mute is not selected
        audio.volume = volValue; // audio volume resumes to what it was before user clicked mute

        // updates ui
        volSlider.value = volValue;
        volSlider.style.setProperty('--volume', `${volValue * 100}%`);
        muteBtn.setAttribute('aria-label', 'enable mute');
        muteTooltip.textContent = 'Mute [ m ]';
        
        if (audio.volume > 0.5) {
            volIcon.src = './assets/svg/volume-high.svg';
        } else if (audio.volume > 0) {
            volIcon.src = './assets/svg/volume-low.svg';
        } else if (audio.volume === 0) {
            volIcon.src = './assets/svg/volume-none.svg';
        }
    }

    isMute = !isMute;
}

// updates time stamp in real time
const timeDisplay = () => {
    clearInterval(progressInterval); // clears existing timer

    if (audio.readyState >= 1) { // checks audio metadata
        endTimeDisplay();
    }

    audio.onloadedmetadata = () => { // when audio metadata is known
        if (hasPlaybackStarted) endTimeDisplay();
    }

    progressInterval = setInterval(() => { // updates ui to display track time stamp in real time
        // startTime.textContent = time(audio.currentTime);
        progressBarDisplay();
    }, 100);
}

// calculates audio time to minutes and seconds
const time = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const displayMins = mins;
    const displaySecs = secs < 10 ? '0' + secs : secs;

    return `${displayMins}:${displaySecs}`;
}

// updates track duration 
const endTimeDisplay = () => {
    const durationInSecs = audio.duration;
    endTime.textContent = time(durationInSecs);
    
    // updates ui
    progressBar.setAttribute('max', durationInSecs);
}

// updates progress bar ui in real time to match track time stamp
const progressBarDisplay = () => {
    if (!isSeeking) {
        progressBar.value = audio.currentTime;
        const timer = (progressBar.value - progressBar.min) / (progressBar.max - progressBar.min) * 100; // converts progress bar value to percentage for ui

        progressBar.style.setProperty('--time', `${timer}%`);
        startTime.textContent = time(audio.currentTime);
    }
}

// updates ui to display track queue list
const toggleTrackList = () => {
    queueContainer.classList.toggle('active');
    isTrackListOpen = !isTrackListOpen;

    if (isTrackListOpen) {
        queueBtn.setAttribute('aria-label', 'close track list');

        if (hasPlaybackStarted) { // if playback has started, scrolls to current track
            setTimeout(() => {
                scrollToCurrentTrack();
            }, 600);
        } else { // if playback has not started, scrolls to the top
            queueContainer.scrollTo({
                behavior: 'smooth',
                top: 0
            });
        }
    } else {
        queueBtn.setAttribute('aria-label', 'open track list');
    }
}

// displays credits in modal dialog
const displayCred = () => {
    const { musicSrc, artworkSrc } = credData;

    artworkCred.innerHTML = `
        <ul>
        <p>Artwork source: 
            <a href="${artworkSrc.siteSrc}" target="_blank">Unsplash</a>
        </p>
            <li>Default cover artwork: 
                <a href="${artworkSrc.mainSrc}" target="_blank">${artworkSrc.mainName}</a>
            </li>
            <li>Album cover artwork: 
                <a href="${artworkSrc.coverSrc}" target="_blank">${artworkSrc.coverName}</a>
            </li>
        </ul>
    `

    musicCred.innerHTML = `
        <p>Music source: 
            <a href="${musicSrc.siteSrc}" target="_blank">${musicSrc.name}</a>
        </p>
        <ul class="music-cred-list"></ul>
    `
    const musicCredList = musicCred.querySelector('.music-cred-list');

    tracks.forEach(i => {
        musicCredList.innerHTML += `
            <li>
                <a href="${i.trackCred}" target="_blank">${i.title}</a> by
                <a href="${i.artistCred}" target="_blank">${i.artist}</a>
            </li>
        `
    });
}

// resets ui to default state
const resetDisplay = () => {
    clearInterval(progressInterval);
    albumCover.src = './assets/imgs/main-cover.jpg';
    trackName.textContent = '';
    artistName.textContent = '';
    albumName.textContent = '';
    progressBar.style.display = 'none';
    startTime.textContent = '';
    endTime.textContent = '';
    playPauseIcon.src = './assets/svg/play.svg';
    playPauseBtn.setAttribute('aria-label', 'play track');
    playPauseTooltip.textContent = 'Play [ space ]';
    hasPlaybackStarted = false;
    index = 0;
    trackQueue.forEach(item => item.classList.remove('playing'));
    queueContainer.scrollTo({
        behavior: 'smooth',
        top: 0
    });

    const currentTracks = !isShuffle ? tracks : newTracks;
    loadAudio(currentTracks[index]);
}

// event listeners

playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
        playAudio();
    } else {
        audio.pause();
        updatePlayerUI();
    }
});

prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', () => {
    playNextTrack();
});

shuffleBtn.addEventListener('click', shuffle);
repeatBtn.addEventListener('click', repeat);

queueBtn.addEventListener('click', () => {
    toggleTrackList();
});

volSlider.addEventListener('input', volume);
muteBtn.addEventListener('click', mute);

// allows user to seek through track using progress bar
progressBar.addEventListener('pointerdown', () => {
    isSeeking = true;
    clearInterval(progressInterval);
});

progressBar.addEventListener('input', () => {
    const timer = (progressBar.value - progressBar.min) / (progressBar.max - progressBar.min) * 100;
    progressBar.style.setProperty('--time', `${timer}%`);

    startTime.textContent = time(progressBar.value);
});

progressBar.addEventListener('change', () => {
    if (isSeeking) {
        audio.currentTime = progressBar.value;
        isSeeking = false;
        timeDisplay();
    }
});

credBtn.addEventListener('click', () => {
    credDialog.showModal();
    credDialog.focus();
});

closeCred.addEventListener('click', () => {
    credDialog.close();
});

// keyboard shortcuts

document.addEventListener('keydown', (e) => {
    if (credDialog.open) return;

    if (e.target.tagName === 'input' || e.target.tagName === 'textarea') return;

    if (e.key === ' ') {
         e.preventDefault();

        if (audio.paused) {
            playAudio();
        } else {
            audio.pause();
            updatePlayerUI();
        }
    }

    const key = e.key.toLowerCase();

    if (key === 'p') {
        if (e.repeat) return;
        playPrevTrack();
    }

    if (key === 'n') {
        if (e.repeat) return;
        playNextTrack();
    }

    if (key === 's') {
        shuffle();
    }

    if (key === 'r') {
        repeat();
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        volSlider.value = Math.min(1, parseFloat(volSlider.value) + 0.05);
        volume();
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        volSlider.value = Math.max(0, parseFloat(volSlider.value) - 0.05);
        volume();
    }

    if (e.key === 'ArrowLeft') {
        e.preventDefault();

        if (audio.currentTime <= 1) {
            playPrevTrack();
        } else {
            audio.currentTime = Math.max(0, audio.currentTime - 5);
            progressBarDisplay();
        }
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();

        if (audio.duration - audio.currentTime <= 1) {
            playNextTrack();
        } else {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
            progressBarDisplay();
        }
    }

    if (key === 'm') {
        mute();
    }

    if (key === 't') {
        toggleTrackList();
    }

    if (key === 'i') {
        credDialog.showModal();
        credDialog.focus();
    }
});

// auto plays next track when current track has ended
audio.addEventListener('ended', autoPlayTrack);

// cspell:ignore unshuffle svgs cybrpnk netrunner