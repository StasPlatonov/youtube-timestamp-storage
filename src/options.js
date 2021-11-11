const defaultSettings = {
    "marker-color": "#FFFFFF",
    "current-marker-color": "#00FF00",
    "marker-width": 4,
    "marker-height": 20,
    "marker-opacity": 0.4,
    "marker-offset": 0,
    "history-depth": 100
};

document.addEventListener('DOMContentLoaded', init);

document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('defaultBtn').addEventListener('click', resetToDefault);

chrome.storage.onChanged.addListener(({settings}) => {
    //console.log(JSON.stringify(settings));
    if (settings && settings.newValue)
    {
        renderOptions(settings.newValue);
    }
});

function localize()
{
    document.getElementById('title').innerText = chrome.i18n.getMessage('options_title');
    document.getElementById('marker-color-label').innerText = chrome.i18n.getMessage('marker_color');
    document.getElementById('current-marker-color-label').innerText = chrome.i18n.getMessage('current_marker_color');
    document.getElementById('marker-width-label').innerText = chrome.i18n.getMessage('marker_width');
    document.getElementById('marker-height-label').innerText = chrome.i18n.getMessage('marker_height');
    document.getElementById('marker-opacity-label').innerText = chrome.i18n.getMessage('marker_opacity');
    document.getElementById('marker-offset-label').innerText = chrome.i18n.getMessage('marker_offset');
    document.getElementById('history-depth-label').innerText = chrome.i18n.getMessage('history_depth');
    document.getElementById('saveBtn').innerText = chrome.i18n.getMessage('save_button');
    document.getElementById('defaultBtn').innerText = chrome.i18n.getMessage('default_button');
}

function resetToDefault() {
    chrome.storage.sync.set({ settings: defaultSettings }, function() {
        var status = document.getElementById('status');
        status.textContent = chrome.i18n.getMessage('saved_message');
        setTimeout(function() {
            status.textContent = '';
        }, 1000);
    });
}

function saveOptions() {
    var settings = {
        "marker-color": document.getElementById('marker-color').value,
        "current-marker-color": document.getElementById('current-marker-color').value,
        "marker-width": document.getElementById('marker-width').value,
        "marker-height": document.getElementById('marker-height').value,
        "marker-opacity": document.getElementById('marker-opacity').value,
        "marker-offset": document.getElementById('marker-offset').value,
        "history-depth": document.getElementById('history-depth').value
    };
    
    chrome.storage.sync.set({ settings: settings }, function() {
        var status = document.getElementById('status');
        status.textContent = chrome.i18n.getMessage('saved_message');
        setTimeout(function() {
            status.textContent = '';
        }, 1000);
    });
}

function logStorage() {
    chrome.storage.sync.get(function(data){
        console.log("chrome.storage.sync:");
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            console.log(data);
        }
    });
}

function renderParameter(settings, name)
{
    document.getElementById(name).value = settings[name];
}

function renderOptions(settings) {
    renderParameter(settings, "marker-color");
    renderParameter(settings, "current-marker-color");
    renderParameter(settings, "marker-width");
    renderParameter(settings, "marker-height");
    renderParameter(settings, "marker-opacity");
    renderParameter(settings, "marker-offset");
    renderParameter(settings, "history-depth");
}
  
function loadOptions() {
    chrome.storage.sync.get({ settings: defaultSettings }, function(data) {
        renderOptions(data.settings);
    });
}

function init() {

    localize();
    
    loadOptions();
}