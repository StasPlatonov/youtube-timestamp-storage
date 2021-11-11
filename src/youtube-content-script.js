/*
баги
1. При смене видео по ссылке, маркеры отображаются не корректно

*/
console.log('Youtube extension attached');

var mainSettings = null;

var markers = new Map();
var currentMarker = null;
var adObserver = null;

var ytVideoPlayer = null;
var ytVideo = null;
var leftControls = null;
var rightControls = null;
var progressBar = null;

var adContainer = null;
var adObserver = null;

var videoId = null;
var markers_container = null;
var markersLoadingTimer = null;

window.addEventListener('yt-navigate-start', init,   true);

window.onload = init;

var switchVideoDetector = setInterval(function() {
    //console.log(`Current location: ${window.location.toString()}`);
    var location = window.location.toString();
    if (location.includes('youtube.com/watch?'))
    {
        var url = new URL(location);
        var video_id = url.searchParams.get("v");
        if (video_id !== videoId) {
            console.log(`Detected switching video to ${video_id}`);
            init();
        }
    }
}, 5000);

chrome.runtime.onMessage.addListener((req, info, cb) => {
    /*if (req.message === 'yt-tab-changed') {
        console.log(`URL changed to ${document.location.href}`);

        if (document.location.href.includes('youtube.com/watch?'))
        {
            //console.log('Location: ' + document.location.href);
            var url = new URL(document.location.href);
            var video_id = url.searchParams.get("v");

            if (video_id != videoId)
            {
                console.log('Another video loaded. Reinitialize...');
                init();
            }
        }
        return true;
    }*/

    if (req.message === 'location-changed') {
        
        var url = new URL(req.url);
        var video_id = url.searchParams.get("v");
        if (video_id !== videoId) {
            init();
        }
        return true;
    }

    if (req.action === "add-marker") {
        createMarker();
        cb();
        return true;
    }
    if (req.action === "remove-marker") {
        removeMarker();
        cb();
        return true;
    }
    if (req.action === "prev-marker") {
        jumpToPrevMarker();
        cb();
        return true;
    }
    if (req.action === "next-marker") {
        jumpToNextMarker();
        cb();
        return true;
    }
    if (req.action === "save-screenshot") {
        saveScreenshot();
        cb();
        return true;
    }
});

chrome.storage.onChanged.addListener(({settings}, namespace) => {
    if (namespace == "sync")
    {
        //console.log('Sync storage change detected');
    
        if (settings && settings.newValue)
        {
            mainSettings = settings.newValue; // Replace settings with new

            deselectMarker(currentMarker);

            markers.forEach(function(marker){
                applyMarkerSettings(marker, settings.newValue);
            });

            selectMarker(currentMarker);
        }
    }
});

/*
function initMarkers(vId, video) {
    console.log(`Init markers for ${vId} with duration ${video.duration}`);
    chrome.runtime.sendMessage({action: 'get-markers', id: vId}, function(timestamps) {
        //console.log(`Loaded markers: ${timestamps}`);
        if (!timestamps)
        {
            console.log(`No markers found for video ${vId}`);
            return;
        }
        if (timestamps.length == 0) {
            console.log(`Markers are empty for video ${vId}`);
            return;
        }
        
        const duration = video.duration;

        timestamps.forEach(function(time){
            // Create
            currentMarker = addVisualMarker(time, duration);
            // Add to map
            markers.set(time, currentMarker);
        });

        if (currentMarker) {
            selectMarker(currentMarker);
        }
    });
}
*/

function initMarkers(video) {
    if (!video) {
        return;
    }
    var timestamps = video.timestamps;

    if (timestamps.length == 0) {
        console.log(`Markers are empty for video ${vId}`);
        return;
    }

    var duration = video.duration ? video.duration : ytVideo.duration;
    
    timestamps.forEach(function(time){
        // Create
        currentMarker = addVisualMarker(time, duration);
        // Add to map
        markers.set(time, currentMarker);
    });

    if (currentMarker) {
        selectMarker(currentMarker);
    }
}

function removeMarkers() {
    console.log(`Remove markers`);
    markers.clear();

    // Remove visual markers
    if (markers_container)
    {
        markers_container.innerHTML = "";
        markers_container.remove();
        markers_container = null;
    }
    currentMarker = null;

    //markersLoadingTimer = null;
    if (markersLoadingTimer) {
        clearInterval(markersLoadingTimer);
        markersLoadingTimer = null;
    }
}

function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

function getTimeString(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time / 60) % 60);
    const seconds = Math.floor(time % 3600);
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
}

function selectMarker(marker) {
    if (!marker) {
        return;
    }

    if (mainSettings) {
        marker.style.background = mainSettings["current-marker-color"];
        marker.style.opacity = 1;
    } else {
        marker.classList.add('marker-current');
    }
}

function deselectMarker(marker){
    if (!marker) {
        return;
    }

    if (mainSettings) {
        marker.style.background = mainSettings["marker-color"];
        marker.style.opacity = parseFloat(mainSettings["marker-opacity"]);
    } else {
        marker.classList.remove('marker-current');
    }
}

function applyMarkerSettings(marker, settings) {
    if (!marker || !settings) {
        return;
    }
    marker.style.background = settings["marker-color"];
    marker.style.width = settings["marker-width"] + "px";
    marker.style.height = settings["marker-height"] + "px";
    marker.style.top = `${-(parseInt(settings["marker-height"]) - 5) - parseInt(settings["marker-offset"])}px`;
    marker.style.opacity = parseFloat(settings["marker-opacity"]);
}

function addVisualMarker(time, duration) {

    let marker = document.createElement('div');
    marker.id = "timestamp-marker-" + Date.now();
    marker.className = "marker";

    marker.setAttribute("time", time.toString());
    marker.setAttribute("tmp_duration", duration);

    let percent = time * 100 / duration;
    marker.style.left = percent + "%";

    if (mainSettings) {
        applyMarkerSettings(marker, mainSettings);
    }
    
    //let pos = time * width / duration;
    //console.log(`Create visual marker ${time} at pos ${pos}`);

    marker.addEventListener("click", ()=>{
        //console.log(`Marker ${time} clicked`);
        jumpToMarker(time);
    }, { passive: true});

    // Hint
    marker.setAttribute("title", `Time: ${getTimeString(time)}`);

    /*tooltip = document.createElement("div");
    tooltip.className = "marker-tooltip";
    tooltip.innerText = "Description";//getTimeString(time);
    marker.appendChild(tooltip);*/

    markers_container.appendChild(marker);
    return marker;
}

function removeVisualMarker(time) {
    //markersElems = progressBar.querySelectorAll(".marker");
    markersElems = markers_container.querySelectorAll(".marker");
    markersElems.forEach(function(markerElem) {
        if (parseFloat(markerElem.getAttribute("time")) == time) {
            markerElem.remove();
            return;
        }
    });
}

function createMarker()
{
    if (!markers_container)
    {
        console.log('Failed to add marker. No markers container found');
        return;
    }

    var url = new URL(window.location.toString());
    var video_id = url.searchParams.get("v");

    var time = ytVideo.currentTime;
    var duration = ytVideo.duration;
    var title = ytVideoPlayer.querySelector(".ytp-title").innerText;

    //console.log(`Create marker at ${time} for ${video_id} with title ${title}`);

    var marker = {
        "vid": video_id,
        "title": title,
        "duration": duration,
        "time": time
    };

    //console.log(`Send message ${JSON.stringify(marker)}`);

    try{
        chrome.runtime.sendMessage({action: 'add-marker', marker}, function() {
            // Deselect current
            if (currentMarker)
            {
                deselectMarker(currentMarker);
            }

            // Create
            currentMarker = addVisualMarker(time, duration);

            // Select new
            selectMarker(currentMarker);

            // Add to map
            markers.set(time, currentMarker);
        });
    }
    catch (error) {
        console.error(`Failed to add marker: ${error.message}`);
    }
}

function removeMarker()
{
    var url = new URL(window.location.toString());
    var video_id = url.searchParams.get("v");

    var markerTime = parseFloat(currentMarker.getAttribute("time"));

    var title = ytVideoPlayer.querySelector(".ytp-title").innerText

    console.log(`Remove marker ${markerTime} from ${video_id}`);

    // Remove from storage
    var marker = {
        "vid": video_id,
        "time": markerTime
    };

    try {
        chrome.runtime.sendMessage({action: 'remove-marker', marker}, function (){
            // Get next marker to select
            selectNext = null;
            if (currentMarker.prevSibling)
            {
                selectNext = currentMarker.prevSibling;
            }
            else if (currentMarker.nextSibling)
            {
                selectNext = currentMarker.nextSibling;
            }

            // Remove visual
            removeVisualMarker(markerTime);

            // Remove from map
            markers.delete(markerTime);

            // Select another marker
            currentMarker = selectNext;
            if (currentMarker)
            {
                selectMarker(currentMarker);
            }
        });
    }
    catch (error) {
        console.error(`Failed to remove marker: ${error.message}`);
    }
}

function jumpToMarker(time)
{
    marker = markers.get(time);

    if (marker === currentMarker)
    {
        return;
    }

    if (currentMarker)
    {
        deselectMarker(currentMarker);
    }

    currentMarker = marker;

    // Select new
    selectMarker(currentMarker);

    const rect = currentMarker.getBoundingClientRect();
    //console.log(`Marker rect: ${rect.x} ${rect.y} ${rect.width} ${rect.height}`);
    //var posX = rect.left;// + window.scrollX;//currentMarker.style.left;
    //var posY = rect.top;// + window.scrollY;//currentMarker.style.top;
    //console.log(`Get element from point ${posX}, ${posY}`);
    //elem = document.elementFromPoint(posX, posY);
    //console.log(`Element from point: ${JSON.stringify(elem)}`)
    /*
    const clickEvent = document.createEvent('MouseEvents');
   
    clickEvent.initEvent(
        'click', // Event type
        true, // bubbles
        true, // cancelable 
        document.defaultView, // view
        1, // detail
        496, // screenx
        650, // screeny
        390, // clientx
        512, // clienty
        false, // ctrlKey
        false, // altKey
        false, // shiftKey
        0, // metaKey
        0, // left button
        null // relatedTarget
    );
    playervideo.dispatchEvent(clickEvent);
    */
    ytVideo.currentTime = time;
}

function checkAndRemoveStaticAD(container) {
    if (!container)
    {
        return;
    }
    var staticAD = container.querySelector('.ytp-ad-overlay-ad-info-dialog-container');
    if (!staticAD)
    {
        return;
    }
    
    console.log(`Static Adv detected. Removing...`);
    //let timerId = setTimeout(function() {
        container.innerHTML = "";
    //}, 100);
}

function checkAndRemoveVideoAD(container) {
    if (!container)
    {
        return;
    }
    var videoAD = container.querySelector('.ytp-ad-player-overlay');
    if (!videoAD)
    {
        return;
    }
     
    console.log(`Video Adv detected. Removing...`);
    let rewindTimer = setTimeout(function() {
        ytVideo.currentTime = ytVideo.duration;
            
        let skipTimer = setTimeout(function() {
            skipButton = container.querySelector('.ytp-ad-skip-button');    
            if (skipButton)
            {
                skipButton.click();
            }
            else{
                console.log('Skip button not found!');
            }
        }, 1000);
    }, 100);
}
//-----------------------------------------------------------------------

function onTargetVideoLoaded(video) {
    ytVideo = ytVideoPlayer.querySelector('video');

    console.log(`Target video loaded. Duration: ${ytVideo.duration}`);

    progressBar = document.querySelector(".ytp-chrome-bottom").querySelector('.ytp-progress-bar');

    if (!document.querySelector('.markers_container')) {
        console.log('Create markers container');
        markers_container = document.createElement('div');
        markers_container.id = "markers_container";
        markers_container.className = "markers_container";

        progressBar.appendChild(markers_container);
    }
    else {
        console.log('Markers container already exists');
    }

    initMarkers(video);

    //markersLoadingTimer = setTimeout(function(){
    //    initMarkers(videoId, ytVideo);
    //}, 100);
}
//-----------------------------------------------------------------------

function initADBlock(container) {
    if (adObserver)
    {
        adObserver.disconnect();
    }

    if (container)
    {
        adObserver = new MutationObserver(function(mutations){
            var nodesAdded = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length)
                {
                    nodesAdded = true;
                    return;
                }
            });

            if (nodesAdded)
            {
                checkAndRemoveStaticAD(container);
                //checkAndRemoveVideoAD(container);
            }
        });
        
        adObserver.observe(container, {childList: true});
    }
    else
    {
        console.log('No ADs container found');
    }

    // ADs can be already loaded at the start
    checkAndRemoveStaticAD(container);
    //checkAndRemoveVideoAD(container);
}
//-----------------------------------------------------------------------

function jumpToPrevMarker() {
    if (!currentMarker)
    {
        return;
    }

    const currMarkerTime = parseFloat(currentMarker.getAttribute("time"));
    //console.log(`Prev from ${currMarkerTime}`);

    let keys =[ ...markers.keys() ];
    keys.sort((a,b) => a-b);
    //console.log(keys);
    currIdx = keys.indexOf(currMarkerTime);
    prevIdx = Math.max(0, currIdx - 1);
    jumpToMarker(keys[prevIdx]);
}
//-----------------------------------------------------------------------

function jumpToNextMarker() {
    if (!currentMarker)
    {
        return;
    }
    
    const currMarkerTime = parseFloat(currentMarker.getAttribute("time"));
    //console.log(`Next from ${currMarkerTime}`);
                    
    let keys =[ ...markers.keys() ];
    keys.sort((a,b) => a-b);
    //console.log(keys);

    currIdx = keys.indexOf(currMarkerTime);
    nextIdx = Math.min(keys.length - 1, currIdx + 1);

    jumpToMarker(keys[nextIdx]);
}
//-----------------------------------------------------------------------

function saveScreenshot() {
    var video = document.querySelector('.html5-main-video');

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // Change the size here
    canvas.width = parseInt(video.offsetWidth);
    canvas.height = parseInt(video.offsetHeight);
    //console.log(`Video size; ${canvas.width}x${canvas.height}`);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    var a = document.createElement('a');

    var url = new URL(window.location.toString());
    url_id = url.searchParams.get("v");

    var time = ytVideo.currentTime;
    timeWithoutDot = time.toString().split('.');
    timeStr = timeWithoutDot.join('-');
    a.download = 'snapshot-' + url_id + '-' + timeStr + '.jpg';
    a.href = canvas.toDataURL('image/jpeg');
    document.body.appendChild(a).click();

    a.remove();
}

function initControls(container) {
    rightControls = container.querySelector('.ytp-right-controls');
    
    buttonsAttached = rightControls.querySelector(".custom-button");

    var addButton;
    if (rightControls && !buttonsAttached) {
            // Prev button
            const prevButton = document.createElement('button');
            prevButton.setAttribute("id", "prev-button");
            prevButton.setAttribute("class", "ytp-button custom-button");
            prevButton.setAttribute("aria-label", "Prev marker");
            prevButton.setAttribute("title", "Prev marker");

            const prevIcon = document.createElement('img');
            prevIcon.setAttribute("height", "32px");
            prevIcon.setAttribute("width", "32px");
            prevIcon.style.paddingBottom = "7px";
            prevIcon.style.paddingLeft = "5px";
            prevIcon.setAttribute("src", chrome.runtime.getURL("icons/prev-white-32.png"));

            prevButton.appendChild(prevIcon);

            prevButton.addEventListener("mouseover", ()=>{
                prevButton.style.opacity = 0.8;
            }, { passive: true});
            prevButton.addEventListener("mouseout", ()=>{
                prevButton.style.opacity = 1;
            }, { passive: true});
            prevButton.addEventListener('click', () =>{
                jumpToPrevMarker();
            }, { passive: true});
            rightControls.appendChild(prevButton);
            //------------------------------------------------------------------------

            // Add button
            addButton = document.createElement('button');
            addButton.setAttribute("id", "add-button");
            addButton.setAttribute("class", "ytp-button custom-button");
            addButton.setAttribute("aria-label", "Add marker");
            addButton.setAttribute("title", "Add marker");

            const addIcon = document.createElement('img');
            addIcon.setAttribute("height", "32px");
            addIcon.setAttribute("width", "32px");
            addIcon.style.paddingBottom = "7px";
            addIcon.style.paddingLeft = "5px";
            addIcon.setAttribute("src", chrome.runtime.getURL("icons/add-white-32.png"));

            addButton.appendChild(addIcon);

            addButton.addEventListener("mouseover", ()=>{
                addButton.style.opacity = 0.8;
            }, { passive: true});
            addButton.addEventListener("mouseout", ()=>{
                addButton.style.opacity = 1;
            }, { passive: true});
            addButton.addEventListener('click', () =>{
                createMarker();
            }, { passive: true});
            rightControls.appendChild(addButton);
            //------------------------------------------------------------------------

            // Remove button
            const removeButton = document.createElement('button');
            removeButton.setAttribute("id", "remove-button");
            removeButton.setAttribute("class", "ytp-button custom-button");
            removeButton.setAttribute("aria-label", "Remove marker");
            removeButton.setAttribute("title", "Remove marker");

            const removeIcon = document.createElement('img');
            removeIcon.setAttribute("height", "32px");
            removeIcon.setAttribute("width", "32px");
            removeIcon.style.paddingBottom = "7px";
            removeIcon.style.paddingLeft = "5px";
            removeIcon.setAttribute("src", chrome.runtime.getURL("icons/del-white-32.png"));

            removeButton.appendChild(removeIcon);

            removeButton.addEventListener("mouseover", ()=>{
                removeButton.style.opacity = 0.8;
            }, { passive: true});
            removeButton.addEventListener("mouseout", ()=>{
                removeButton.style.opacity = 1;
            }, { passive: true});
            removeButton.addEventListener('click', () =>{
                removeMarker();
            }, { passive: true});
            
            rightControls.appendChild(removeButton);
            //------------------------------------------------------------------------

            // Next button
            const nextButton = document.createElement('button');
            nextButton.setAttribute("id", "next-button");
            nextButton.setAttribute("class", "ytp-button custom-button");
            nextButton.setAttribute("aria-label", "Next marker");
            nextButton.setAttribute("title", "Next marker");

            const nextIcon = document.createElement('img');
            nextIcon.setAttribute("height", "32px");
            nextIcon.setAttribute("width", "32px");
            nextIcon.style.paddingBottom = "7px";
            nextIcon.style.paddingLeft = "5px";
            nextIcon.setAttribute("src", chrome.runtime.getURL("icons/next-white-32.png"));

            nextButton.appendChild(nextIcon);

            nextButton.addEventListener("mouseover", ()=>{
                nextButton.style.opacity = 0.8;
            }, { passive: true});
            nextButton.addEventListener("mouseout", ()=>{
                nextButton.style.opacity = 1;
            }, { passive: true});
            nextButton.addEventListener('click', () =>{
                jumpToNextMarker();
            }, { passive: true});
            rightControls.appendChild(nextButton);
            //------------------------------------------------------------------------

            // Shot button
            const shotButton = document.createElement('button');
            shotButton.setAttribute("id", "shot-button");
            shotButton.setAttribute("class", "ytp-button custom-button");
            shotButton.setAttribute("aria-label", "Shot");
            shotButton.setAttribute("title", "Shot");

            const icon = document.createElement('img');
            icon.setAttribute("height", "32px");
            icon.setAttribute("width", "32px");
            icon.style.paddingBottom = "7px";
            icon.style.paddingLeft = "5px";
            icon.setAttribute("src", chrome.runtime.getURL("icons/screenshot-white-32.png"));

            shotButton.appendChild(icon);

            shotButton.addEventListener("mouseover", ()=>{
                shotButton.style.opacity = 0.8;
            }, { passive: true});
            shotButton.addEventListener("mouseout", ()=>{
                shotButton.style.opacity = 1;
            }, { passive: true});
            shotButton.addEventListener('click', () =>{
                saveScreenshot();
            }, { passive: true});
            
            rightControls.appendChild(shotButton);
            //------------------------------------------------------------------------
    }

    setInterval(function() {
        if (!addButton) {
            return;
        }
        if (isAdShowing()) {
            addButton.disabled = true;
        } else {
            addButton.disabled = false;
        }
    }, 1000);
}
//-----------------------------------------------------------------------

function loadSettings() {
    if (mainSettings)
    {
        return;
    }
    console.log(`Loading settings...`);

    chrome.runtime.sendMessage({action: 'get-settings'}, function(sett) {
        mainSettings = sett;
    });
}
//-----------------------------------------------------------------------

function isAdShowing() {
    return (document.querySelector("div.ad-showing") != null);
}
//-----------------------------------------------------------------------

function init() {
    // Only attach while specific video view
    if (!document.location.href.includes('youtube.com/watch?'))
    {
        console.log(`Skip current location ('${document.location.href}') from init`);
        return;
    }

    // video changed
    var url = new URL(window.location.toString());
    var video_id = url.searchParams.get("v");
    if (video_id === videoId)
    {
        return;
    }
    videoId = video_id;

    console.log("Init extension");
    
    loadSettings();

    ytVideoPlayer = document.querySelector('.html5-video-player');
    if (!ytVideoPlayer)
    {
        return;
    }

    removeMarkers();

    ytVideo = ytVideoPlayer.querySelector('video');

    adContainer = ytVideoPlayer.querySelector('.video-ads');

    // Video load event
    //ytVideo.addEventListener('loadeddata', (event) => {
    /*ytVideo.addEventListener('loadeddata', (event) => {
        console.log(`Video data loaded. Duration: ${ytVideo.duration}`);

        if (!markersLoadingTimer)
        {
            // init markers if loaded video is not AD (markers relies on video duration)
            if (!adContainer || !adContainer.querySelector('.ytp-ad-player-overlay')) {
                // Now video loaded and it is not an AD
                onTargetVideoLoaded();
            }
        }
    }, true);*/

    chrome.runtime.sendMessage({action: 'get-video', id: videoId}, function(video) {
        markersLoadingTimer = setInterval(function() {
            // If we have video and duration in DB - check by it
            if (video && video.duration) {
                if (ytVideo.duration != video.duration) {
                    console.log('Video has different duration. Waiting more...');
                    return;
                }
            }
            else { // otherwise check by absence of AD
                //var videoAD = adContainer.querySelector('.ytp-ad-player-overlay');
                //if (videoAD)
                if (isAdShowing()) {
                    console.log('AD still playing. Waiting more...');
                    return;
                }
            }

            // Stop timer
            clearInterval(markersLoadingTimer);

            onTargetVideoLoaded(video);
            
            markersLoadingTimer = null;
        }, 1000);
    });

    initControls(document.querySelector(".ytp-chrome-bottom"));

    initADBlock(adContainer);
}