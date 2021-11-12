var settings;

const defaultSettings = {
    "marker-color": "#FFFFFF",
    "current-marker-color": "#00FF00",
    "marker-width": 4,
    "marker-height": 20,
    "marker-opacity": 0.4,
    "marker-offset": 0,
    "history-depth": 100,
    "show_labels": false
};

// Read settings
chrome.storage.sync.get({ settings: defaultSettings }, function(data) {
    settings = data.settings;
});

//var lastLocation = null;
//var lastVideoId = null;

/*
console.log('Set URL check timeout');
var switchVideoDetector = setInterval(function() {
    chrome.tabs.query({ active: true, currentWindow: true}, function(tabs) {
        if (tabs.length == 0) {
            return;
        }
        var tab = tabs[0];
        if (!tab) {
            return;
        }
        var location = tab.url;
        console.log(`Current location: ${location}`);
        if (location.includes('youtube.com/watch?'))
        {
            if (lastLocation != location) {
                var url = new URL(location);
                var video_id = url.searchParams.get("v");
                if (video_id && (video_id !== lastVideoId)) {
                    console.log(`Detected switching video to ${video_id}`);
                    
                    //getCurrentTabId().then((tabId)=>{
                        chrome.tabs.sendMessage(tab.id, {action: "location-changed", location: location}, ()=>{
                        });
                    //});
                }
            }
        }
    });
}, 5000);
*/
chrome.storage.local.getBytesInUse(['videodata'], function(bytes){
    var percent = 100.0 * bytes / chrome.storage.local.QUOTA_BYTES;
    console.log(`Storage size is ${bytes} bytes (${percent}%)`);
});

function getStoragePercent(callback) {
    chrome.storage.local.getBytesInUse(['videodata'], function(bytes){
        const percent = 100.0 * bytes / chrome.storage.local.QUOTA_BYTES;
        callback(percent);
    });
}

function cleanMarkers(id) {
    if (!id) {
        console.log('Clean all markers...');
        chrome.storage.local.clear();
    }
    else {
        console.log(`Clean markers for id ${id}`);
    }
}

chrome.commands.onCommand.addListener((command) => {
    //console.log("Command: " + command);
    if (command === "add-marker") {
        getCurrentTabId().then((tabId)=>{
            chrome.tabs.sendMessage(tabId, {action: command}, ()=>{
            });
        });
        return true;
    }

    if (command === "remove-marker") {
        getCurrentTabId().then((tabId)=>{
            chrome.tabs.sendMessage(tabId, {action: command}, ()=>{
            });
        });
        return true;
    }

    if (command === "prev-marker") {
        getCurrentTabId().then((tabId)=>{
            chrome.tabs.sendMessage(tabId, {action: command}, ()=>{
            });
        });
        return true;
    }

    if (command === "next-marker") {
        getCurrentTabId().then((tabId)=>{
            chrome.tabs.sendMessage(tabId, {action: command}, ()=>{
            });
        });
        return true;
    }
    
    if (command === "save-screenshot") {
        getCurrentTabId().then((tabId)=>{
            chrome.tabs.sendMessage(tabId, {action: command}, ()=>{
            });
        });
        return true;
    }
})
//-------------------------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((req, info, callback) =>{
    // This requires "activeTab" permission
    //if (message == "runContentScript"){
    //    chrome.tabs.executeScript({file: 'youtube-content-script.js'});
    //}
    if (req.action === 'add-marker') {
        //console.log(`Add marker ${JSON.stringify(req.marker)} to storage`);

        getVideo({"vid": req.marker.vid}, function(video){
            //console.log(`Add time ${req.marker.time} to video ${req.marker.vid}`);

            if (!video) {
                video = {"id": req.marker.vid, "timestamps": []};
            }

            video["title"] = req.marker.title;
            video["author"] = req.marker.author;
            video["author_link"] = req.marker.author_link;
            video["duration"] = req.marker.duration;
            video["modified"] = Date.now();
            // Add timestamp and sort
            video["timestamps"].push(req.marker.time);
            video["timestamps"].sort((a,b) => a-b);
            
            setVideo(video, function(){
                //console.log(`Video ${JSON.stringify(video)} updated`);
                callback();
            });
        })
        return true;
    }

    if (req.action === 'remove-marker') {
        //console.log(`Remove marker ${JSON.stringify(req.marker)} from storage`);

        getVideo({"vid": req.marker.vid}, function(video){
            //console.log(`Remove time ${req.marker.time} from video ${req.marker.vid}`);

            if (!video)
            {
                callback();
                return;
            }

            timestamps = video["timestamps"];
            
            index = timestamps.indexOf(req.marker.time);
            if (index == -1)
            {
                callback();
            }
            
            timestamps.splice(index, 1);
                
            video["modified"] = Date.now();

            setVideo(video, function() {
                console.log(`Video ${JSON.stringify(video)} updated`);
                callback();
            });
        })
        return true;
    }

    if (req.action === 'get-video')
    {
        getVideo({"vid": req.id}, function(video){
            callback(video);
        });

        return true; // for async operations
    }

    if (req.action === 'clean-all-markers') {
        cleanMarkers();
    }

    if (req.action === 'clean-markers') {
        cleanMarkers(req.id);
    }

    if (req.action === 'get-settings') {
        chrome.storage.sync.get({ settings: defaultSettings }, function(data) {
            settings = data.settings;
            callback(data.settings);
        });

        return true;
    }

    if (req.action === 'get-data') {
        chrome.storage.local.get("videodata", function(data){
            callback(data);
        });
        return true;
    }

    if (req.action === 'remove-video') {
        removeVideo(req.ids, callback);
        return true;
    }
})
//-------------------------------------------------------------------------------------------

function logStorage() {
    /*if (chrome.storage) {
        chrome.storage.local.get(function(data){
            console.log("chrome.storage.local:");
            if(chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                console.log(data);
            }
            //chrome.storage.sync.get(function(data){
            //    console.log("chrome.storage.sync:");
            //    if(chrome.runtime.lastError) {
            //        console.error(chrome.runtime.lastError);
            //    } else {
            //        console.log(data);
            //    }
            //});
        });
    } else {
        console.warn("chrome.storage is not accessible, check permissions");
    }*/
}
//-------------------------------------------------------------------------------------------

function getVideo(params, callback)
{
    //console.log(`getVideo params: ${JSON.stringify(params)}`);
    chrome.storage.local.get("videodata", function(data){
        if (!data || !data.videodata)
        {
            callback(null);
            return;
        }

        videos = data["videodata"]["videos"];

        var found = videos.find(v => v.id === params.vid);

        callback(found);
    });
}
//-------------------------------------------------------------------------------------------

function setVideo(video, callback)
{
    //console.log(`Saving video ${JSON.stringify(video)}...`);
    chrome.storage.local.get("videodata", function(data){
        if (!data || ! data.videodata)
        {
            //console.log(`No videodata found. Creating..`);
            new_data = {"videos": [video]};

            chrome.storage.local.set({"videodata": new_data}, function(){
                console.log(`Video ${JSON.stringify(video)} has been saved to storage`);
                callback();
            });
            return;
        }

        videodata = data.videodata;
        
        videos = videodata["videos"];

        var found = videos.find(v => v.id === video.id);
        
        if (found) {
            index = videos.indexOf(found)
            videos[index] = video;

            chrome.storage.local.set({"videodata": videodata}, function(){
                console.log(`Video ${JSON.stringify(video)} has been saved to storage`);
                callback();
            });
            return;
        }

        //console.log(`Video with id ${video["id"]} not found (on set). Creating...`);
        
        videos.push(video);

        if (settings) {
            // Check history size
            if (videos.length > settings["history-depth"]) 
            {
                videos.sort(function(left, right) {
                    return (left.modified - right.modified);
                });

                console.log(`History limit reached. Removing oldest video ${videos[0].id}`);
                videos.splice(0, 1);
            }
        }

        // @TODO: Remove video if it has no markers?
        //remainedVideos = videos.filter(video => (video["timestamps"].length > 0));
        //videodata["videos"] = remainedVideos;
        
        chrome.storage.local.set({"videodata": videodata}, function(){
            //console.log(`Videodata successfully saved`);
            console.log(`Video ${JSON.stringify(video)} has been saved to storage`);
            //logStorage();
            callback();
        });
    });
}
//-------------------------------------------------------------------------------------------

function removeVideo(ids, callback) {
    if (ids.length === 0)
    {
        return;
    }
    chrome.storage.local.get("videodata", function(data){
        if (!data || ! data.videodata)
        {
            return;
        }

        videodata = data.videodata;
    
        videos = videodata["videos"];

        remainedVideos = videos.filter(video => (!ids.includes(video["id"])));
        //console.log(`Remained ${remainedVideos.length} of ${videos.length}`);
    
        videodata["videos"] = remainedVideos;
    
        chrome.storage.local.set({"videodata": videodata}, function(){
            console.log(`Videos ${ids} has been removed from storage`);
            callback();
        });
    });
}
//-------------------------------------------------------------------------------------------

async function getCurrentTabId() {
    let queryOptions = {active: true, currentWindow: true};
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab.id;
}
//-------------------------------------------------------------------------------------------

/*
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') 
    {
        console.log('TABS update detected');
        //chrome.tabs.sendMessage(tabId, { message: 'yt-tab-changed' });
    }
})
*/

/*
crypto.runtime.onInstalled.addListener(({reason}) => {
    if (reason === 'install') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });

        chrome.runtime.setUninstallURL('about:blank')
    }
});
*/

