window.onload = init;

chrome.storage.onChanged.addListener(({videodata}) =>{
    update();
});
//-------------------------------------------------------------------------------------------

function showError(text)
{
   $('.error').show();
   $('.error').html(text);
}

function hideError()
{
   $('.error').hide();
}
//-------------------------------------------------------------------------------------------

function formatDateTime(value) {
    var date = new Date(value);
    
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };

    const timeOptions = { hour12 : false, hour:  "2-digit", minute: "2-digit", second: "2-digit" };
 
    return date.toLocaleDateString("ru-RU", dateOptions) + " " + date.toLocaleTimeString("ru-RU", timeOptions);
}
//-------------------------------------------------------------------------------------------

function render(videodata) {
    var rowsData = [];

    videos = videodata["videos"];

    var markersCount = 0;
    videos.forEach(function(video) {
        const timestamps = video["timestamps"];
        var row = {
            "id": video.id,
            "title": video.title,
            "modified": formatDateTime(video.modified),
            "markers": timestamps.length.toString(),
            "author": video.author ? {"name": video.author, "link": video.author_link} : null,
            "link": `https://youtube.com/watch?v=${video.id}`
        };

        rowsData.push(row);
        markersCount += video["timestamps"].length;
    })

    $("#total-videos-value").text(videos.length);
    $("#total-markers-value").text(markersCount);

    var table = $('#markers-table').DataTable();
    table.clear();
    table.rows.add(rowsData);

    table.columns.adjust().draw(); // Fix column sizes
}
//-------------------------------------------------------------------------------------------

function update() {
    chrome.storage.local.get("videodata", function(data){
        if (!data || !data.videodata) {
            return;
        }

        videos = data["videodata"]["videos"];

        render(data["videodata"]);
    });

    chrome.storage.local.getBytesInUse(['videodata'], function(bytes){
        const percent = 100.0 * bytes / chrome.storage.local.QUOTA_BYTES;
        $("#storage-size-value").text(percent.toFixed(2) + "%"); 
    });
}
//-------------------------------------------------------------------------------------------

function localize() {
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.dataset.locale);
    });
    
    document.querySelectorAll('[title-locale]').forEach(elem => {
        elem.setAttribute("title", chrome.i18n.getMessage(elem.getAttribute("title-locale")));
    });
}
//-------------------------------------------------------------------------------------------

function removeSelected() {
    var table = $('#markers-table').DataTable();
    selected = table.rows( { selected: true } ).data();

    var ids = [];
    for (var i=0; i < selected.length ;i++){
        var rowData = selected[i];
        ids.push(rowData["id"]);
    }
    //console.log(ids);

    chrome.runtime.sendMessage({action: 'remove-video', ids: ids}, function() {
        update();
    });
}
//-------------------------------------------------------------------------------------------

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    a.remove();
}

function init() {
    localize();

    $('#exportBtn').on('click', function() {
        chrome.storage.local.get("videodata", function(data){
            if (!data || !data.videodata) {
                return;
            }
            
            download(JSON.stringify(data.videodata, null, 2), 'videodata.json', 'text/plain');
        });
    });

    $('#importBtn').on('change', function() {
        var fr = new FileReader();
        fr.onload = function(){
            //console.log(`Loaded file ${fr.result}`);
            try {
                videodata = JSON.parse(fr.result);
                if (!videodata) {
                    console.error('No data to import');
                    return;
                }

                chrome.runtime.sendMessage({action: 'import-data', data: videodata}, function() {
                    update();
                });
            } catch (error) {
                console.error(`Failed to import data: ${error.message}`);
            }
        }
              
        fr.readAsText(this.files[0]);
    });

    $('#removeBtn').on('click', function() {
        removeSelected();
    });

    $('#optionsBtn').on('click', function() {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    var table = $('#markers-table').DataTable( {
            columns: [
                { 
                    data: null,
                    defaultContent: "",
                    orderable: false,
                    className: 'select-checkbox',
                },
                { 
                    data: null,
                    defaultContent: "",
                    orderable: false
                },
                { 
                    data: "title", 
                    width: "50%"
                },
                { 
                    data: "modified", 
                    width: "10%"
                },
                { 
                    data: "markers",
                    width: "10%"
                },
                { 
                    data: "author",
                    width: "10%",
                    render: function (data) {
                        if (!data) {
                            return "";
                        }

                        return `<a href="${data.link}" target="_blank" rel="noopener noreferrer">${data.name}</a>`;
                    }
                },
                {   
                    data: "link", 
                    render: function (data) {
                        return `<a href="${data}" target="_blank" rel="noopener noreferrer">${chrome.i18n.getMessage('watch_link')}</a>`;
                    } 
                }
            ],
            autoWidth: false,
            /*searching: false,*/
            scrollX: true,
            scrollY: 300,
            dom: 'Bfrtip',
            responsive: true,
            paging: true,
            pageLength: 100,
            order: [[ 3, "desc" ]],
            buttons: [
                /*'copy', 'excel', 'pdf'*/
            ],
            select: {
                style:    'os',
                selector: 'td:first-child'
            },
            language: {
                emptyTable:     chrome.i18n.getMessage("table_empty_table"),
                info:           chrome.i18n.getMessage("table_info"),
                infoEmpty:      chrome.i18n.getMessage("table_info_empty"),
                infoFiltered:   chrome.i18n.getMessage("table_info_filtered"),
                lengthMenu:     chrome.i18n.getMessage("table_length_menu"),
                loadingRecords: chrome.i18n.getMessage("table_loading_records"),
                processing:     chrome.i18n.getMessage("table_processing"),
                search:         chrome.i18n.getMessage("table_search"),
                zeroRecords:    chrome.i18n.getMessage("table_zero_records"),
                paginate: {
                    first:      chrome.i18n.getMessage("table_paginate_first"),
                    last:       chrome.i18n.getMessage("table_paginate_last"),
                    next:       chrome.i18n.getMessage("table_paginate_next"),
                    previous:   chrome.i18n.getMessage("table_paginate_previous")
                },
                select: {
                    rows: chrome.i18n.getMessage("table_select_rows")
                },
            },
            // Add some magic to enable search =)
            initComplete: function () {
                // Apply the search

                var api = this.api();
                 // For each column
                api
                .columns()
                .eq(0)
                .each(function (colIdx) {
                    // Set the header cell to contain the input element
                    var cell = $('.filters th').eq(
                        $(api.column(colIdx).header()).index()
                    );
                    var title = $(cell).text();
                    $(cell).html('<input type="text" placeholder="' + title + '" />');
 
                    // On every keypress in this input
                    $(
                        'input',
                        $('.filters th').eq($(api.column(colIdx).header()).index())
                    )
                        .off('keyup change')
                        .on('keyup change', function (e) {
                            e.stopPropagation();
 
                            // Get the search value
                            $(this).attr('title', $(this).val());
                            var regexr = '({search})';
 
                            var cursorPosition = this.selectionStart;
                            // Search the column for that value
                            api
                                .column(colIdx)
                                .search(
                                    this.value != ''
                                        ? regexr.replace('{search}', '(((' + this.value + ')))')
                                        : '',
                                    this.value != '',
                                    this.value == ''
                                )
                                .draw();
 
                            $(this)
                                .focus()[0]
                                .setSelectionRange(cursorPosition, cursorPosition);
                        });
                });
            }
    });

    // Add index column
    table.on('order.dt search.dt', function () {
        table.column(1, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
            cell.innerHTML = i+1;
        } );
    });
    
    update();
}
//---------------------------------------------------------------------------------------------

