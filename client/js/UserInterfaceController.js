var UserInterfaceController = function() {
    var _this = this;
    
    var currentFile
    var searchResultHtmlElementByPath
    var fileHtmlElementByPath
    var stateByPath = {}
    var fileEntries = []
	var editorPool = new EditorPool();
	var editorThemes = this.editorThemes = (function() {
        // Getting available themes
        var themes = [];
        $('link[rel^="stylesheet"][name]').each(function() {
            var $link   = $(this);
            $.each($link.attr('name').split(','), function(id, item) {
                var theme = {};
                theme.name  = item.replace(/(^\s*|\s*$)/, '');
                theme.value = theme.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                themes.push(theme);
            });
        });
        return themes;
    })();


    var ignore = ['.git', '.nide', '.DS_Store']
    var limitRecursion = ['node_modules']
    
    var addHTMLElementForFileEntry = function(entry, parentElement, fileEntriesArray, htmlElementByPathTable, ownContext, doLimitRecursion) {
    
        if (ignore.indexOf(entry.name) != -1) {
            return;
        }
    
        var thisElement = document.createElement("li");
        htmlElementByPathTable[entry.path] = thisElement
    
        if (fileEntriesArray && !doLimitRecursion) {
            fileEntriesArray.push(entry)
        }
    
        if (entry.type == "directory") {
            thisElement.className = 'folder'
            if (stateByPath[entry.path] == 'open') {
                thisElement.className += ' open'
            }
            thisElement.innerHTML = '<img src="img/folder.png">' + entry.name + (ownContext ? (' <i>(' + entry.path + ')</i>') : '')
            $(thisElement).click(function(e) {
                if (!e.offsetX) e.offsetX = e.clientX - $(e.target).position().left;
                if (!e.offsetY) e.offsetY = e.clientY - $(e.target).position().top;
                if (e.target == thisElement && e.offsetY < 24) {
                    if (e.offsetX < 24) {
                        $(this).toggleClass('open');
                        stateByPath[entry.path] = $(this).hasClass('open') ? 'open' : '';
                        e.stopPropagation()
                    } else {
                        _this.selectFile(entry, htmlElementByPathTable)
                        e.stopPropagation()
                    }
                }
            })
            var ul = document.createElement("ul")
            thisElement.appendChild(ul)
            for (var childEntry in entry.children) {
                addHTMLElementForFileEntry(entry.children[childEntry], ul, fileEntriesArray, ownContext ? {} : htmlElementByPathTable, false, doLimitRecursion || limitRecursion.indexOf(entry.name) != -1)
            }
        } else {
            thisElement.innerHTML = '<img src="img/file.png">' + entry.name + (ownContext ? (' <i>(' + entry.path + ')</i>') : '')
            $(thisElement).click(function(e) {
                _this.selectFile(entry, htmlElementByPathTable)
            })
        }
        if (entry.name.charAt(0) == '.') {
            thisElement.className += ' hidden'
        }
        parentElement.appendChild(thisElement)
    }

    var doSearch = function() {
        if (this.value != '') {
            for (var i = 0; i < fileEntries.length; i++) {
                if (fileEntries[i].name.match(this.value)) {
                    $(searchResultHtmlElementByPath[fileEntries[i].path]).slideDown()
                } else {
                    $(searchResultHtmlElementByPath[fileEntries[i].path]).slideUp()
                }
            }
            $('#project').slideUp();
            $('#search').slideDown();
        } else {
            $('#project').slideDown();
            $('#search').slideUp();
        }
    }
    $('#search-field').keyup(doSearch).click(doSearch)

    $('#project').click(function(e) {
        if (e.target == $('#project')[0]) {
            _this.selectFile({
                type: 'project',
                path: '/'
            }, null, $('#project')[0])
        }
    })

    $('#npm').click(function(e) {
        if (e.target == $('#npm')[0]) {
            _this.selectFile({
                type: 'npm',
                path: '/'
            }, null, $('#npm')[0])
        }
    })

	$("#npm-package-json").click(function(e){
		if (e.target == $('#npm-package-json')[0]) {
			_this.selectFile({
				type: 'package.json',
				path: '/package.json'
			}, null, $('#npm-package-json')[0])
		}
	})

    $('#docs').click(function(e) {
        if (e.target == $('#docs')[0]) {
            _this.selectFile({
                type: 'documentation',
                path: '/'
            }, null, $('#docs')[0])
        }
    })

    $('#add-file').click(function(e) {
        var filename = prompt('Type in a filename for the new file:', 'untitled.js')
        if (filename) {
            var path;
            if (!currentFile) {
                path = '/'
            } else {
                switch(currentFile.type) {
                    case 'directory':
                        path = currentFile.path + '/'
                        break;
                    case 'file':
                        path = currentFile.path.replace(/\/[^\/]+$/, '/')
                        break;
                    default:
                        path = '/'
                        break;
                }
            }
            
            connection.addFile(path + filename)
        }
    })

    $('#add-folder').click(function(e) {
        var filename = prompt('Type in a filename for the new folder', 'folder')
        if (filename) {
            var path;
            if (!currentFile) {
                path = '/'
            } else {
                switch(currentFile.type) {
                    case 'directory':
                        path = currentFile.path + '/'
                        break;
                    case 'file':
                        path = currentFile.path.replace(/\/[^\/]+$/, '/')
                        break;
                    default:
                        path = '/'
                        break;
                }
            }
            connection.addFolder(path + filename)
        }
    })

    $('#remove-file').click(function(e) {
        if (currentFile) {
            var confirmed
            if (currentFile.type == 'file') {
                confirmed = confirm('Are you sure?')
            } else if (currentFile.type == 'directory') {
                confirmed = confirm('This will remove the directory and all its contents. Are you sure?')
            } else {
                confirmed = false
            }
            if (confirmed) {
                connection.removeFile(currentFile.path)
            }
        }
    })



    this.updateFileListing = function(files) {
        searchResultHtmlElementByPath = {}
        fileHtmlElementByPath = {}
        fileEntries = []
        var ul = document.createElement("ul")
        for (var file in files) {
            addHTMLElementForFileEntry(files[file], ul, fileEntries, fileHtmlElementByPath)
        }
        document.getElementById('files').innerHTML = '';
        document.getElementById('files').appendChild(ul);

        ul = document.createElement("ul")
        for (var i = 0; i < fileEntries.length; i++) {
            addHTMLElementForFileEntry(fileEntries[i], ul, null, searchResultHtmlElementByPath, true)
        }
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('search-results').appendChild(ul);
    }
    
    var setCurrentEditor = function(editor) {
        var children = $('#content').children()
        children.css({ visibility: 'hidden', zIndex: -1 });
        if ($.inArray(editor, children) >= 0) {
            $(editor).css({ visibility: 'visible', zIndex: 1 })
        } else {
            $('#content').append(editor)
        }
        editor.focus()
    };

	this.setOptionOnCodeEditors = function(name,value) {
		editorPool.setOptionOnCodeEditors(name,value);
	}

    this.displayWelcomeScreen = function() {
        $('#lightbox').fadeIn()
        $('.setup form').bind('submit', function(e) {
            var name = $(".setup input[name='name']")[0].value;
            var description = $(".setup input[name='description']")[0].value;
            var author = $(".setup input[name='author']")[0].value;
            var version = $(".setup input[name='version']")[0].value;
            if (!version.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
                alert('Please enter the version number in the X.Y.Z format.')
                e.preventDefault();
                return;
            }
            e.preventDefault()
            connection.addFile('/package.json')
            connection.saveFile('/package.json', JSON.stringify({
                name: name,
                description: description,
                version: version,
                author: author,
                dependencies: {},
                devDependencies: {}
            }, undefined, '    '), function() {
                $('#lightbox').fadeOut()
                connection.skipWelcome()
            })
        })
        $('.setup .skip').click(function(){
            $('#lightbox').fadeOut()
            connection.skipWelcome()
        })
    }

    this.selectFile = function(entry, htmlElementByPathTable, htmlElement) {
        if (!htmlElementByPathTable) {
            htmlElementByPathTable = fileHtmlElementByPath;
        }
    
        $('.selected').removeClass('selected')
        currentFile = entry
        $(htmlElement || htmlElementByPathTable[currentFile.path]).addClass('selected')
    
        var editor = editorPool.editorForEntry(entry, function(discarted){
            $(discarted).remove()
        })
        
        setCurrentEditor(editor)
    }
}
