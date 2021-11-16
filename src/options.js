const defaultSettings = {
    "marker-color": "#FFFFFF",
    "current-marker-color": "#00FF00",
    "marker-width": 4,
    "marker-height": 15,
    "marker-opacity": 0.2,
    "marker-offset": 0,
    "history-depth": 200,
    "show_labels": true
};
//-------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', init);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('defaultBtn').addEventListener('click', resetToDefault);
//-------------------------------------------------------------------------------------------

chrome.storage.onChanged.addListener(({settings}) => {
    //console.log(JSON.stringify(settings));
    if (settings && settings.newValue)
    {
        renderOptions(settings.newValue);
    }
});
//-------------------------------------------------------------------------------------------

function localize()
{
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.dataset.locale);
    });
}
//-------------------------------------------------------------------------------------------

function resetToDefault() {
    chrome.storage.sync.set({ settings: defaultSettings }, function() {
        var status = document.getElementById('status');
        status.textContent = chrome.i18n.getMessage('saved_message');
        setTimeout(function() {
            status.textContent = '';
        }, 1000);
    });
}
//-------------------------------------------------------------------------------------------

function saveOptions() {
    var settings = {
        "marker-color": document.getElementById('marker-color').value,
        "current-marker-color": document.getElementById('current-marker-color').value,
        "marker-width": document.getElementById('marker-width').value,
        "marker-height": document.getElementById('marker-height').value,
        "marker-opacity": document.getElementById('marker-opacity').value,
        "marker-offset": document.getElementById('marker-offset').value,
        "history-depth": document.getElementById('history-depth').value,
        "show_labels": document.getElementById('show-labels').checked
    };

    console.log(JSON.stringify(settings));
    
    chrome.storage.sync.set({ settings: settings }, function() {
        var status = document.getElementById('status');
        status.textContent = chrome.i18n.getMessage('saved_message');
        setTimeout(function() {
            status.textContent = '';
        }, 1000);
    });
}
//-------------------------------------------------------------------------------------------

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
//-------------------------------------------------------------------------------------------

function renderParameter(settings, name)
{
    document.getElementById(name).value = settings[name];
}
//-------------------------------------------------------------------------------------------

function renderOptions(settings) {
    renderParameter(settings, "marker-color");
    renderParameter(settings, "current-marker-color");
    renderParameter(settings, "marker-width");
    renderParameter(settings, "marker-height");
    renderParameter(settings, "marker-opacity");
    renderParameter(settings, "marker-offset");
    renderParameter(settings, "history-depth");
    document.getElementById('show-labels').checked = settings.show_labels;
}
  //-------------------------------------------------------------------------------------------

function loadOptions() {
    chrome.storage.sync.get({ settings: defaultSettings }, function(data) {
        renderOptions(data.settings);
    });
}
//-------------------------------------------------------------------------------------------

function init() {

    localize();
    
    loadOptions();
}
//-------------------------------------------------------------------------------------------
