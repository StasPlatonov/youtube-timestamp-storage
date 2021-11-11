window.onload = init;

chrome.storage.onChanged.addListener(({videodata}) =>{
    update();
});
//-----------------------------------------------------------------------------------

function showError(text)
{
   $('.error').show();
   $('.error').html(text);
}

function hideError()
{
   $('.error').hide();
}
//-----------------------------------------------------------------------------------
/*
function doRefresh()
{
    // Refresh statistics
    $.ajax({
            type : "GET",
            url : "http://worldtimeapi.org/api/timezone/Europe/Moscow",
            dataType : 'json',
            contentType : 'application/json; charset=UTF-8',
            success: function(result){
                hideError();
                $('#current-time').text(`Time: ${result["datetime"]}`);
            },
            error : function(xhr, status, error) {
                console.log('Ошибка: ' + xhr.responseText + ' : ' + error);
                showError("Ошибка получения времени");
            }
    });
}

doRefresh();
*/

function clearView() {

}
//-----------------------------------------------------------------------------------

function formatDateTime(value) {
    var date = new Date(value);
    
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };

    const timeOptions = { hour12 : false, hour:  "2-digit", minute: "2-digit", second: "2-digit" };
 
    return date.toLocaleDateString("ru-RU", dateOptions) + " " + date.toLocaleTimeString("ru-RU", timeOptions);
}
//-----------------------------------------------------------------------------------

function render(videodata) {
    var rowsData = [];

    videos = videodata["videos"];

    var markersCount = 0;
    videos.forEach(function(video) {
        const timestamps = video["timestamps"];
        var row = {
            "id": video["id"],
            "title": video["title"],
            "modified": formatDateTime(video["modified"]),
            "markers": timestamps.length.toString(),
            "link": `https://youtube.com/watch?v=${video["id"]}`
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
//-----------------------------------------------------------------------------------

function update() {
    clearView();

    chrome.storage.local.get("videodata", function(data){
        if (!data || !data.videodata) {
            return;
        }

        videos = data["videodata"]["videos"];

        /*
        var markersCount = 0;
        videos.forEach(function(video, i) {
            //const id = video["id"];
            //const title = video["title"];
            //const modified = video["modified"];
            const timestamps = video["timestamps"];
            markersCount += timestamps.length;
            //console.log(`Video (id:${id} title:'${title}' modified:${modified} timestamps:${timestamps.length})`);
        });

        console.log(`Total ${videos.length} videos with ${markersCount} markers`);
        */

        render(data["videodata"]);
    });
}
//-----------------------------------------------------------------------------------

function localize() {
    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.dataset.locale);
    });
    
    document.querySelectorAll('[title-locale]').forEach(elem => {
        elem.setAttribute("title", chrome.i18n.getMessage(elem.getAttribute("title-locale")));
    });
}
//-----------------------------------------------------------------------------------

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
//-----------------------------------------------------------------------------------

function init() {
    localize();

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
                    data: "link", 
                    render: function (data) {
                        return `<a href="${data}" target="_blank" rel="noopener noreferrer">${chrome.i18n.getMessage('watch_link')}</a>`;
                    } 
                }
            ],
            autoWidth: false,
            searching: false,
            scrollX: true,
            scrollY: 300,
            dom: 'Bfrtip',
            responsive:true,
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
                emptyTable:     "Данные в таблице недоступны",
                info:           "Записи с _START_ по _END_ из _TOTAL_",
                infoEmpty:      "Записей нет",
                infoFiltered:   "(отфильтровано из _MAX_ записей)",
                lengthMenu:     "Отображать _MENU_ записей",
                loadingRecords: "Загрузка...",
                processing:     "Обработка...",
                search:         "Поиск:",
                zeroRecords:    "Совпадений не найдено",
                paginate: {
                    first:      "Начало",
                    last:       "Конец",
                    next:       "След.",
                    previous:   "Пред."
                },
                select: {
                    rows: "Строк выбрано: %d"
                }
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

