//console.log('Timestamps Storage for YouTube extension attached');

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
//-------------------------------------------------------------------------------------------


var switchVideoDetector = setInterval(function() {
    //console.log(`Current location: ${window.location.toString()}`);
    var location = window.location.toString();
    if (location.includes('youtube.com/watch?'))
    {
        var url = new URL(location);
        var video_id = url.searchParams.get("v");
        if (video_id !== videoId) {
            //console.log(`Detected switching video to ${video_id}`);
            init();
        }
    }
}, 5000);
//-------------------------------------------------------------------------------------------


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

    /*if (req.message === 'location-changed') {
        
        var url = new URL(req.url);
        var video_id = url.searchParams.get("v");
        if (video_id !== videoId) {
            init();
        }
        return true;
    }*/

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
//-------------------------------------------------------------------------------------------


chrome.storage.onChanged.addListener(({settings}, namespace) => {
    if (namespace == "sync")
    {
        //console.log('Sync storage change detected');
    
        if (settings && settings.newValue)
        {
            //console.log('Apply new settings');
            mainSettings = settings.newValue; // Replace settings with new

            deselectMarker(currentMarker);

            markers.forEach(function(marker){
                applyMarkerSettings(marker, settings.newValue);
            });

            selectMarker(currentMarker);
        }
    }
});
//-------------------------------------------------------------------------------------------


function initMarkers(video) {
    if (!video) {
        return;
    }
    var timestamps = video.timestamps;

    if (timestamps.length == 0) {
        //console.log(`Markers are empty for video ${vId}`);
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
//-------------------------------------------------------------------------------------------


function removeMarkers() {
    //console.log(`Remove markers`);
    markers.clear();

    // Remove visual markers
    if (markers_container)
    {
        markers_container.innerHTML = "";
        markers_container.remove();
        markers_container = null;
    }
    currentMarker = null;

    if (markersLoadingTimer) {
        clearInterval(markersLoadingTimer);
        markersLoadingTimer = null;
    }
}
//-------------------------------------------------------------------------------------------


function pad(num, size) {
    num = num.toString();
    while (num.length < size) num = "0" + num;
    return num;
}

function getTimeString(time) {
    const floor = Math.floor(time);
    const hours = Math.floor(floor / 3600);
    const minutes = Math.floor((floor / 60) % 60);
    const seconds = Math.floor(floor % 60);
    return hours ? `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}` : `${pad(minutes, 2)}:${pad(seconds, 2)}`;
}
//-------------------------------------------------------------------------------------------


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
//-------------------------------------------------------------------------------------------


function applyMarkerSettings(marker, settings) {
    if (!marker || !settings) {
        return;
    }
    marker.style.background = settings["marker-color"];
    marker.style.width = settings["marker-width"] + "px";
    marker.style.height = settings["marker-height"] + "px";
    marker.style.top = `${-(parseInt(settings["marker-height"]) - 5) - parseInt(settings["marker-offset"])}px`;
    marker.style.opacity = parseFloat(settings["marker-opacity"]);

    tooltip = marker.children[0];
    tooltip.style.opacity = settings.show_labels ? 1 : 0;
}
//-------------------------------------------------------------------------------------------


function addVisualMarker(time, duration) {

    let marker = document.createElement('div');
    marker.id = "timestamp-marker-" + Date.now();
    marker.className = "marker";

    marker.setAttribute("time", time.toString());

    let percent = time * 100 / duration;
    marker.style.left = percent + "%";

    //let pos = time * width / duration;
    //console.log(`Create visual marker ${time} at pos ${pos}`);

    // Hint
    var marker_tooltip = document.createElement("div");
    marker_tooltip.className = "marker-tooltip";
    //marker_tooltip.className = "marker-tooltip-vertical";
    marker_tooltip.style.opacity = (mainSettings && mainSettings.show_labels) ? 1 : 0;

    var marker_tooltip_text = document.createElement("div");
    marker_tooltip_text.className = "marker-tooltip-text";
    //marker_tooltip_text.className = "marker-tooltip-text-vertical";
    marker_tooltip_text.innerText = getTimeString(time);
    marker_tooltip.appendChild(marker_tooltip_text);
    

    /*
    var marker_tooltip_input = document.createElement("input");
    marker_tooltip_input.className = "marker-tooltip-input";
    marker_tooltip_input.type = "text";
    marker_tooltip_input.style.display = "none";
    marker_tooltip.appendChild(marker_tooltip_input);
    */
    //marker_tooltip.style.opacity = 0;
    
    marker_tooltip.addEventListener('dblclick', function (e) {
        //marker_tooltip_input.style.display = "block";
        //console.log('Double clicked');
        //marker.style.opacity = 1;
    });

    marker.appendChild(marker_tooltip);

    marker.addEventListener("click", ()=>{
        jumpToMarker(time);
    }, { passive: true});
    marker.addEventListener("mouseover", ()=>{
        marker_tooltip.style.opacity = 0;
    }, { passive: true});
    marker.addEventListener("mouseout", ()=>{
        marker_tooltip.style.opacity = 1;
    }, { passive: true});

    
    markers_container.appendChild(marker);

    if (mainSettings) {
        applyMarkerSettings(marker, mainSettings);
    }

    return marker;
}
//-------------------------------------------------------------------------------------------


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
//-------------------------------------------------------------------------------------------


function createMarker()
{
    if (!markers_container)
    {
        console.error('Failed to add marker. No markers container found');
        return;
    }

    var url = new URL(window.location.toString());
    var video_id = url.searchParams.get("v");

    var time = ytVideo.currentTime;
    var duration = ytVideo.duration;
    var title = ytVideoPlayer.querySelector(".ytp-title").innerText;

    const chName = document.querySelector("ytd-video-secondary-info-renderer").querySelector("ytd-channel-name");
    const text = chName.querySelector("yt-formatted-string[id='text']");
    const aItem = text.querySelector("a");
    const authorName = aItem.innerText;
    const authorLink = aItem.getAttribute("href");

    //const author = document.querySelector("span[itemprop='author']");
    //const authorName = author.querySelector("link[itemprop='name']").getAttribute("content");
    //const authorLink = author.querySelector("link[itemprop='url']").getAttribute("href");

    //console.log(`Create marker at ${time} for ${video_id} with title ${title}`);

    var marker = {
        "vid": video_id,
        "title": title,
        "author": authorName,
        "author_link": authorLink,
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
//-------------------------------------------------------------------------------------------


function removeMarker()
{
    var url = new URL(window.location.toString());
    var video_id = url.searchParams.get("v");

    var markerTime = parseFloat(currentMarker.getAttribute("time"));

    var title = ytVideoPlayer.querySelector(".ytp-title").innerText

    //console.log(`Remove marker ${markerTime} from ${video_id}`);

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
//-------------------------------------------------------------------------------------------


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
//-------------------------------------------------------------------------------------------


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
    
    //console.log(`Static Adv detected. Removing...`);
    
    //let timerId = setTimeout(function() {
        container.innerHTML = "";
    //}, 100);
}
//-------------------------------------------------------------------------------------------


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
     
    //console.log(`Video Adv detected. Removing...`);
    let rewindTimer = setTimeout(function() {
        ytVideo.currentTime = ytVideo.duration;
            
        let skipTimer = setTimeout(function() {
            skipButton = container.querySelector('.ytp-ad-skip-button');    
            if (skipButton)
            {
                skipButton.click();
            }
            else{
                //console.log('Skip button not found!');
            }
        }, 1000);
    }, 100);
}
//-------------------------------------------------------------------------------------------


function onTargetVideoLoaded(video) {
    ytVideo = ytVideoPlayer.querySelector('video');

    //console.log(`Target video loaded. Duration: ${ytVideo.duration}`);

    progressBar = document.querySelector(".ytp-chrome-bottom").querySelector('.ytp-progress-bar');

    if (!document.querySelector('.markers_container')) {
        //console.log('Create markers container');
        markers_container = document.createElement('div');
        markers_container.id = "markers_container";
        markers_container.className = "markers_container";

        progressBar.appendChild(markers_container);
    }
    else {
        //console.log('Markers container already exists');
    }

    initMarkers(video);
}
//-------------------------------------------------------------------------------------------


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
        //console.log('No ADs container found');
    }

    // ADs can be already loaded at the start
    checkAndRemoveStaticAD(container);
    //checkAndRemoveVideoAD(container);
}
//-------------------------------------------------------------------------------------------


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
//-------------------------------------------------------------------------------------------


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
//-------------------------------------------------------------------------------------------


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
//-------------------------------------------------------------------------------------------


function isFullScreen() {
    return ytVideoPlayer.classList.contains("ytp-fullscreen");
}
//-------------------------------------------------------------------------------------------


function addButtonTooltip(button, text) {
    var tooltip = document.createElement('div');
    tooltip.className = "custom-button-tooltip custom-button-tooltip-text-wrapper";
    tooltip.style.top = `${button.style.top - 35}px`;

    var tooltip_text = document.createElement('span');
    tooltip_text.className = "custom-button-tooltip-text";
    tooltip_text.innerText = button.getAttribute("hint");;
    tooltip.appendChild(tooltip_text);

    button.addEventListener("mouseover", ()=>{
        var br = button.getBoundingClientRect();
        var ttr = tooltip.getBoundingClientRect();

        tooltip.style.lineHeight = `${isFullScreen() ? 22 : 15}px`; // Change tooltip line size in fullscreen mode
        
        //@TODO: fix hardcoded offset. use label width
        tooltip.style.left = `${br.left - (ttr.right - ttr.left) / 2 - 40}px`;
        tooltip.style.opacity = 1;

        // Change text size in fullscreen mode
        var percent = isFullScreen() ? 118 : 100;
        tooltip.style.fontSize = `${percent}%`; 
        tooltip_text.style.fontSize = `${isFullScreen() ? 17 : 12}px`;
    }, { passive: true});

    button.addEventListener("mouseout", ()=>{
        tooltip.style.opacity = 0;
    }, { passive: true});

    button.appendChild(tooltip);
}
//-------------------------------------------------------------------------------------------

function initControls(container) {
    rightControls = container.querySelector('.ytp-right-controls');
    
    buttonsAttached = rightControls.querySelector(".custom-button");

    var addButton;
    if (rightControls && !buttonsAttached) {
            // Prev button
            const prevButton = document.createElement('button');
            prevButton.setAttribute("id", "prev-button");
            prevButton.setAttribute("class", "ytp-button custom-button");
            //prevButton.setAttribute("aria-label", "Prev marker");
            prevButton.setAttribute("hint", chrome.i18n.getMessage("tooltip_prev"));

            const prevIcon = document.createElement('img');
            prevIcon.setAttribute("height", "32px");
            prevIcon.setAttribute("width", "32px");
            prevIcon.style.paddingBottom = "7px";
            prevIcon.style.paddingLeft = "5px";
            prevIcon.setAttribute("src", chrome.runtime.getURL("icons/prev-white-32.png"));

            prevButton.appendChild(prevIcon);

            prevButton.addEventListener("mouseover", ()=>{
                //prevButton.style.opacity = 0.8;
            }, { passive: true});
            prevButton.addEventListener("mouseout", ()=>{
                //prevButton.style.opacity = 1;
            }, { passive: true});
            prevButton.addEventListener('click', () =>{
                jumpToPrevMarker();
            }, { passive: true});

            addButtonTooltip(prevButton);

            rightControls.appendChild(prevButton);

            //------------------------------------------------------------------------

            // Next button
            const nextButton = document.createElement('button');
            nextButton.setAttribute("id", "next-button");
            nextButton.setAttribute("class", "ytp-button custom-button");
            //nextButton.setAttribute("aria-label", "Next marker");
            nextButton.setAttribute("hint", chrome.i18n.getMessage("tooltip_next"));

            const nextIcon = document.createElement('img');
            nextIcon.setAttribute("height", "32px");
            nextIcon.setAttribute("width", "32px");
            nextIcon.style.paddingBottom = "7px";
            nextIcon.style.paddingLeft = "5px";
            nextIcon.setAttribute("src", chrome.runtime.getURL("icons/next-white-32.png"));

            nextButton.appendChild(nextIcon);

            nextButton.addEventListener("mouseover", ()=>{
                //nextButton.style.opacity = 0.8;
            }, { passive: true});
            nextButton.addEventListener("mouseout", ()=>{
                //nextButton.style.opacity = 1;
            }, { passive: true});
            nextButton.addEventListener('click', () =>{
                jumpToNextMarker();
            }, { passive: true});

            addButtonTooltip(nextButton);
            rightControls.appendChild(nextButton);
            //------------------------------------------------------------------------
            
            // Add button
            addButton = document.createElement('button');
            addButton.setAttribute("id", "add-button");
            addButton.setAttribute("class", "ytp-button custom-button");
            //addButton.setAttribute("aria-label", "Add marker");
            addButton.setAttribute("hint", chrome.i18n.getMessage("tooltip_add_marker"));

            const addIcon = document.createElement('img');
            addIcon.setAttribute("height", "32px");
            addIcon.setAttribute("width", "32px");
            addIcon.style.paddingBottom = "7px";
            addIcon.style.paddingLeft = "5px";
            addIcon.setAttribute("src", chrome.runtime.getURL("icons/add-white-32.png"));

            addButton.appendChild(addIcon);

            addButton.addEventListener("mouseover", ()=>{
                //addButton.style.opacity = 0.8;
            }, { passive: true});
            addButton.addEventListener("mouseout", ()=>{
                //addButton.style.opacity = 1;
            }, { passive: true});
            addButton.addEventListener('click', () =>{
                createMarker();
            }, { passive: true});

            addButtonTooltip(addButton);
            rightControls.appendChild(addButton);
            //------------------------------------------------------------------------

            // Remove button
            const removeButton = document.createElement('button');
            removeButton.setAttribute("id", "remove-button");
            removeButton.setAttribute("class", "ytp-button custom-button");
            //removeButton.setAttribute("aria-label", "Remove marker");
            removeButton.setAttribute("hint", chrome.i18n.getMessage("tooltip_remove_marker"));

            const removeIcon = document.createElement('img');
            removeIcon.setAttribute("height", "32px");
            removeIcon.setAttribute("width", "32px");
            removeIcon.style.paddingBottom = "7px";
            removeIcon.style.paddingLeft = "5px";
            removeIcon.setAttribute("src", chrome.runtime.getURL("icons/del-white-32.png"));

            removeButton.appendChild(removeIcon);

            removeButton.addEventListener("mouseover", ()=>{
                //removeButton.style.opacity = 0.8;
            }, { passive: true});
            removeButton.addEventListener("mouseout", ()=>{
                //removeButton.style.opacity = 1;
            }, { passive: true});
            removeButton.addEventListener('click', () =>{
                removeMarker();
            }, { passive: true});
            addButtonTooltip(removeButton);
            
            rightControls.appendChild(removeButton);
            //------------------------------------------------------------------------

            // Shot button
            const shotButton = document.createElement('button');
            shotButton.setAttribute("id", "shot-button");
            shotButton.setAttribute("class", "ytp-button custom-button");
            //shotButton.setAttribute("aria-label", "Shot");
            shotButton.setAttribute("hint", chrome.i18n.getMessage("tooltip_screenshot"));

            const icon = document.createElement('img');
            icon.setAttribute("height", "32px");
            icon.setAttribute("width", "32px");
            icon.style.paddingBottom = "7px";
            icon.style.paddingLeft = "5px";
            icon.setAttribute("src", chrome.runtime.getURL("icons/screenshot-white-32.png"));

            shotButton.appendChild(icon);

            shotButton.addEventListener("mouseover", ()=>{
                //shotButton.style.opacity = 0.8;
            }, { passive: true});
            shotButton.addEventListener("mouseout", ()=>{
                //shotButton.style.opacity = 1;
            }, { passive: true});
            shotButton.addEventListener('click', () =>{
                saveScreenshot();
            }, { passive: true});
            addButtonTooltip(shotButton);

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
//-------------------------------------------------------------------------------------------


function loadSettings() {
    if (mainSettings)
    {
        return;
    }
    //console.log(`Loading settings...`);

    chrome.runtime.sendMessage({action: 'get-settings'}, function(sett) {
        mainSettings = sett;
    });
}
//-------------------------------------------------------------------------------------------


function isAdShowing() {
    return (document.querySelector("div.ad-showing") != null);
}
//-------------------------------------------------------------------------------------------

function init() {
    // Only attach while specific video view
    if (!document.location.href.includes('youtube.com/watch?'))
    {
        //console.log(`Skip current location ('${document.location.href}') from init`);
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

    //console.log("Init extension");
    
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
                    //console.log('Video has different duration. Waiting more...');
                    return;
                }
            }
            else { // otherwise check by absence of AD
                //var videoAD = adContainer.querySelector('.ytp-ad-player-overlay');
                //if (videoAD)
                if (isAdShowing()) {
                    //console.log('AD still playing. Waiting more...');
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
//-------------------------------------------------------------------------------------------
