 
/*
  Gridster drag & drop & draw App for Kohl's web page development
  Originally programmed by Cory Schulz in May and June of 2014
*/

var gridster;
var resizeElement;
var isDraggingorResizing = 0;
var blockNumber = 0;
var clickEventsSet = false;
var newSqRow = 0, newSqCol = 0;
var newSqWidth= 0, newSqHeight = 0;

function getBlockCountFromPx(val){	return Math.round(val/66);              }



// This function is called from Pages setup
function setGridster(){

	// Reset gridster before we reset it
	if (gridster){
		gridster.remove_all_widgets();
	}

	// Remove previous draw-div mouse events
	unbindDrawingMouseEvents();

	gridster = $("#gridster ul").gridster({
		widget_base_dimensions: [64, 64],
		widget_margins: [1, 1],
		min_cols: 16,
		max_cols: 16,
		min_rows: 24,
		helper: 'clone',
		resize: {
			enabled: true,
			max_size: [16, 16],
			min_size: [1, 1],
			start: function(){ 			resizeStarted();	},
			stop:   function(e, ui, $widget) {	resizeStopped()   	},
			resize: function(e, ui, $widget) {	updateDrawSize()	}
		},
		draggable:{
			start: function(){  isDraggingorResizing = 1; },
			stop: function(event, ui){dragStopped()}
		}
	}).data('gridster');

	function resizeStarted(){
		isDraggingorResizing = 1;
		resizeElement = $('.preview-holder'); 
	}

	function updateDrawSize(){
		$('.resizing .draw-text').html( getBlockCountFromPx(resizeElement.width()) + ' x ' + getBlockCountFromPx(resizeElement.height()) );
	}

	function dragStopped(){
		isDraggingorResizing = 0;
		saveBlockData();
	}

	function resizeStopped(){
		isDraggingorResizing = 0;
		saveBlockData();
	}


	var mouseDown = 0;
	var sX = 0, sY = 0, eX = 0, eY = 0;

	var gridOffset = $( "#gridster" ).offset();
	var drawDiv = $('#draw-div');
	
	var drawText = document.getElementById('draw-text');
	var gridsterDropbox = document.getElementById('gridster');


	bindDrawingMouseEvents();

	// ************* Re-Add draw-div mouse events
	// if (!clickEventsSet){
	// 	bindDrawingMouseEvents();
	// 	clickEventsSet = true;
	// }
	
	// ************* Draw new block events
	// $( '.gs-w' ).mousedown(function(e) {
	// //console.log('mouse down li in Gridster');
	// //mouseDown = 0;
	// });



    // ************* Helper functions for draw box
	function showDrawDiv(){ 			drawDiv.css({ display: "block" });  	}
	function hideDrawDiv(){ 			drawDiv.css({ display: "none" });   	}
	
	// Set Left, Top
	function positionDrawDiv(x, y){
		y+= 1; x += 1; // Add one for the 1 px border, 
		drawDiv.css({ left: x + 'px', top: y + 'px' });
	}

	// Resize div width and height
	function redrawDrawDiv(pageX, pageY, shift){

		// Do some width and height calculations
		eX = pageX - gridOffset.left - sX - 5;
		eY = pageY - gridOffset.top - sY - 5;

		// Round to the nearest square
		eX = roundToSquare(eX);
		eY = roundToSquare(eY);

		// Minimum of 1 square
		if (eX < 66) eX = 66;
		if (eY < 66) eY = 66;

		// If Shift key, make square based on smallest side
		if(shift){
			if (eX < eY){
			  eY = eX;
			}else{
			  eX = eY
			}
		}

		// Convert pixel count to quantized block count
		newSqWidth = getBlockCountFromPx(eX);
		newSqHeight = getBlockCountFromPx(eY);

		// Update displayed block text
		drawText.innerHTML =  newSqWidth + ' x ' + newSqHeight;

		// Set width and height of draw div
		drawDiv.css({  width: eX + 'px', height: eY + 'px' });
	}

	


	// Window Scroll, extend canvas to make more room when you scroll to the bottom of the screen
	// $( window ).scroll(function() {

	// 	console.log('test');
	// 	console.log('scroll: ',  $("#app-container").scrollTop() );

	// 	if ( $('#gridster-ul').height() - $(window).height() - $("#app-container").scrollTop() - 10
	// 		< 0 && $("#app-container").scrollTop() > 1){
	// 		// Add 528px to the height
	// 		$( "#gridster-ul" ).css('min-height', $( "#gridster ul" ).height() + 1056 + 'px');
	// 	}

	//});




	$("#app-container").scroll(function() {
		if ( $('#gridster-ul').height() - $(window).height() - $("#app-container").scrollTop() - 10
			< 0 && $("#app-container").scrollTop() > 1){
			// Add 528px to the height
			$( "#gridster-ul" ).css('min-height', $( "#gridster ul" ).height() + 1056 + 'px');
		}


	});


    resetBlockClickEvents();


  

	// ************* Bindings
	function unbindDrawingMouseEvents(){
		$( "#gridster ul" ).unbind('mousemove');
		$( "#gridster ul" ).unbind('mouseup');
		$( "#draw-div"  ).unbind('mouseup');
		$( "body" ).unbind('mouseup');
		$( document ).unbind('keyup');
		$( document ).unbind('keydown');
	}

	function bindDrawingMouseEvents(){
		gridsterDropbox.addEventListener('dragenter', stopPropagation, false);
		gridsterDropbox.addEventListener('dragexit', stopPropagation, false);
		gridsterDropbox.addEventListener('dragover', stopPropagation, false);
		gridsterDropbox.addEventListener('drop', imageDropped, false);

		// Cancel out of drawing 
		$( document ).keyup( function( e ) {
			if( e.which=== 27 || e.keyCode === 27 ) {
			  if (mouseDown){
			      mouseDown = 0;
			      hideDrawDiv();
			  }
			}
		
		});

		// Overrides the delete key to erase a block
		// $( document ).keydown( function( e ) {
		// 	if (e.keyCode == 8){
		// 		//e.stopPropagation();
		// 		//e.preventDefault();
		// 		//deleteBlock();
		// 	}
		// });

		// Mouse Down
		$( '#gridster ul' ).mousedown(function(e) {

			// Only if left mouse button
			if (e.button === 0) {
				e.stopPropagation();
				e.preventDefault(); 

				// Set mouse down state as true
				mouseDown = 1;

				// Calculate starting position 
				gridOffset = $( "#gridster" ).offset();

				// e.offset is more accurate and positions relative to the grid top left corner
				sX = roundDownToSquare(e.offsetX);
				sY = roundDownToSquare(e.offsetY);

				// Save row and col position
				newSqRow = Math.round(sY/66) + 1;
				newSqCol = Math.round(sX/66) + 1;

				// Position draw div
				positionDrawDiv(sX, sY);
				redrawDrawDiv(e.pageX, e.pageY, e.shiftKey);
				showDrawDiv();

			}
		});
	 	// Mouse Move
		$( "#gridster ul" ).mousemove(function(e) {
			if (mouseDown){
				e.stopPropagation();
				e.preventDefault(); 
				redrawDrawDiv(e.pageX, e.pageY, e.shiftKey);
			}
		});
		// Mouse Up
		$( "#gridster ul" ).mouseup(function(e) {
			if (mouseDown){
			    mouseDown = 0;
			    hideDrawDiv();
			    log("+++++  Make new Block: gridster ul - mouseup"); 
			    makeNewBlockFromDrag();
			 }
		});

		$( "#draw-div" ).mousemove(function(e) {
			e.stopPropagation();
			e.preventDefault(); 
			redrawDrawDiv(e.pageX, e.pageY, e.shiftKey);
		});
		$( "#draw-div" ).mouseup(function(e) {
			mouseDown = 0;
			hideDrawDiv();
			log("+++++  Make new Block: draw-div- mouseup"); 
			makeNewBlockFromDrag();
		});


		$( "body" ).mouseup(function(e) {
			if (mouseDown){
			    mouseDown = 0;
			    hideDrawDiv();
			    log("+++++  Make new Block: body - mouseup"); 
			    makeNewBlockFromDrag();
			}

		});

		// $( "#gridster ul" ).mousemove(function(e) {
		// 	if (mouseDown){
		// 	  e.stopPropagation();
		// 	  e.preventDefault(); 
		// 	  redrawDrawDiv(e.pageX, e.pageY, e.shiftKey);
		// 	}
		// });

	}




}  // ************************************  setGridster Function  ************************************


// ************* Make new blocks
function makeNewBlockFromDrag(width, height){
	// Set mouse state back to false
	createNewBlock( newSqCol, newSqRow, newSqWidth, newSqHeight, null, null);
}

function makeNewBlockFromImage(image, col, row){
	// Get image width and height and round down
	// Assumes all images are at double resolution
	var width = Math.round(image.width/128);
	var height = Math.round(image.height/128);		
	createNewBlock( col, row, width, height, image.name, image.src);
}


function roundToSquare(val){ 		return Math.round(val/66) * 66			}
function roundDownToSquare(val){	return Math.floor(val/66) * 66			}


// ************  Drag images into browser  ************
// Image(s) were dropped!
function imageDropped(e) {
	e.stopPropagation();
	e.preventDefault();
	// Gotta catch em all
	for (var i = 0; i < e.dataTransfer.files.length; ++i){
		loadImage(e.dataTransfer.files[i], e.layerX, e.layerY);  
	}       
}

// Load image data and make new block
function loadImage(file, x, y) {
	var reader = new FileReader();
	// Read the file
	reader.onload = function (event) {
		var image = new Image();

		// Set image source and name
		image.src = event.target.result;
		image.name = file.name;

		var col = (roundDownToSquare(x)/66) + 1;
		var row = (roundDownToSquare(y)/66) + 1;

		makeNewBlockFromImage(image, col, row );
	};
	reader.readAsDataURL(file);
}

// Used in the image drop events
function stopPropagation(e) {
	e.stopPropagation();
	e.preventDefault();
}

function imageUpdated(e){
	e.stopPropagation();
	e.preventDefault();
	putImage( e.dataTransfer.files[0] );  
	
}

// Load image data and make new block
function putImage(file) {
	var reader = new FileReader();
	// Read the file
	reader.onload = function (event) {
		var image = new Image();

		// Set image source and name
		image.src = event.target.result;
		image.name = file.name;
		image.setAttribute("class", "show-image");

		if (App.SelectedBlock.get('image')){
			// Update Image name and data
			App.SelectedBlockImage.set('imgName', file.name);
			App.SelectedBlockImage.set('imgData', event.target.result);
			App.SelectedBlock.set('imageName', file.name);
			
			App.SelectedBlockImage.get('content').save();
			App.SelectedBlock.get('content').save();

			$('#' + App.SelectedBlockImage.get('id')).attr('src', event.target.result);


		}else{
			console.log('no image');
			var newImage = App.Store.createRecord('image', {
				imgName: file.name,
				imgData: event.target.result
			});

			newImage.save().then(function( imgObj ) {

				console.log('saved!');
				App.SelectedBlock.set("image", imgObj.id );
				App.SelectedBlock.set('imageName', file.name);
				
				App.SelectedBlock.get('content').save();
				App.SelectedBlockImage.set('content', imgObj);
				image.setAttribute("id", imgObj.get('id'));
				$('#' + App.SelectedBlock.get('id')).prepend(image);

			}, function(resp) {
				if (resp.responseJSON) {
					log('Image Save didnt work: ', resp.responseJSON );
				} 
			});


		}
		
	};
	reader.readAsDataURL(file);
}




//  This sets the click events for the blocks on the grid that trigger
//  a redirect to the block detail page.
 function resetBlockClickEvents(){

	// Double Click
    //$( ".gs-w" ).unbind('click');
    $( ".gs-w" ).unbind('dblclick');
    $( ".gs-w" ).unbind('mousedown');

	setTimeout(function(){
		//$( ".gs-w" ).click(function(e) {
		$( ".gs-w" ).on('click', function(e) {	
			// console.log('block clicked: ', e.target);
			// console.log('block clicked: ', e.delegateTarget.getAttribute('block-id'));
			if ( e.delegateTarget.getAttribute('block-id') ){
				// Highlight specific block
				$('.selected-block').removeClass('selected-block');
				$('#' + e.delegateTarget.getAttribute('block-id')).addClass('selected-block');

				// Go to block detail
				Router.transitionTo('blockdetail', e.delegateTarget.getAttribute('block-id'));
				e.preventDefault();
			}
			
		});

		// $( ".gs-w" ).dblclick(function(e) {
		// 	Router.transitionTo('block', e.target.getAttribute('block-id'));
		// });

		$( ".gs-w" ).mousedown(function(e) {
			if( e.button == 2 ) {
				e.preventDefault();
				e.stopPropagation();
				log('right click');
				return false;
			}
		});


	}, 1000);

    }


/////////////////////////////////////////////
// Create new Block and save
/////////////////////////////////////////////
  
// function createNewBlock( col, row, width, height, imageName, imageData, module){

// 	// Use Store object from Page route to make new block
// 	var newBlock = App.Store.createRecord('block', {
// 			dCol:     col,
// 			dRow:     row,
// 			dSizeX:   width,
// 			dSizeY:   height
// 		});

// 	if (module){
// 		console.log('module', module);
// 	}else{
// 		console.log('no module');
// 	}

// 	// If there's an image, make it and save it
// 	if (imageName && imageData){

// 		var newImage = App.Store.createRecord('image', {
// 			imgName: imageName,
// 			imgData: imageData
// 		});

// 		// After image is saved then add to block and save block
// 		newImage.save().then(function( imgObj ) {

// 			newBlock.set("image", imgObj.id );

// 			log('Image save worked: ', imgObj.id );

// 			saveNewBlock(newBlock);

// 			}, function(resp) {

// 				if (resp.responseJSON) {
// 				log('Image Save didnt work: ', resp.responseJSON );
// 				} 
				
// 			});
// 	}else{	
// 		// No image, just save block
// 		saveNewBlock(newBlock);
// 	}

// }

  
function createNewBlock( col, row, width, height, imageName, imageData, module){


	// Use Store object from Page route to make new block
	var newBlock = App.Store.createRecord('block', {
			dCol:     col,
			dRow:     row,
			dSizeX:   width,
			dSizeY:   height,
			html: 	  "",
			dBorderB: true,
			dBorderR: true,
			boxContentIsAnchor: false
		});

	// If it's a module, then we need to copy over some data
	if (module){
		newBlock.set('isRawHTML', module.get('isRawHTML')  );
		newBlock.set('html', module.get('html')  );
		newBlock.set('gridBoxClasses', module.get('gridBoxClasses')  );
		newBlock.set('gridContentClasses', module.get('gridContentClasses')  );
		newBlock.set('moduleName', module.get('name')  );
		newBlock.set('boxContentIsAnchor', module.get('boxContentIsAnchor')  );
		
		// If it's raw html, it doesn't need borders
		if ( module.get('isRawHTML') ){
			newBlock.set('dBorderB', false);
			newBlock.set('dBorderR', false);
		}
	}

	// If there's an image, make it and save it
	if (imageName && imageData){

		var newImage = App.Store.createRecord('image', {
			imgName: imageName,
			imgData: imageData
		});

		// After image is saved then add to block and save block
		newImage.save().then(function( imgObj ) {

			newBlock.set("image", imgObj.id );
			newBlock.set("imageName", imgObj.get('imgName') );

			saveNewBlock(newBlock);

			}, function(resp) {

				if (resp.responseJSON) {
					log('Image Save didnt work: ', resp.responseJSON );
				} 
				
			});
	}else{	
		// No image, just save block
		saveNewBlock(newBlock);
	}

}

// Saves the new block after we've created it and added data to it
function saveNewBlock(newBlock){

	// Save new block
	newBlock.save().then(function(data) {

		// Bind to new block
		resetBlockClickEvents();

		// After we get the ID add it to the page and save that
		App.Store.find( 'page', CurrentPageId ).then(function(page) {
			page.get('blocks').pushObject(newBlock);
			page.save().then(function(data) {
					
					saveBlockData();

					var width = newBlock.get('dSizeX');
					var height = newBlock.get('dSizeY');
					var row = newBlock.get('dRow');
					var col = newBlock.get('dCol');

					// gridster.add_widget( generatePreviewCodeForBlock(newBlock),  width,  height,  col,  row);
					
					// if (newBlock.get('image')){

					// }

					drawNewBlockFromEmberHelper( newBlock, page.get('id') );

				}, function(resp) {
					page.save(); // Save didn't work, try again
				});
		});

	}, function(resp) {
		if (resp.responseJSON) {
			alert('Save didnt work: ', resp.responseJSON );
		} 
		// Save didn't work
	});

}



function drawNewBlockFromEmberHelper(b, parentPageId){

	var id = b.get('id');
	var width = b.get('dSizeX');
	var height = b.get('dSizeY');
	var row = b.get('dRow');
	var col = b.get('dCol');


	// Wait till we have gridster set up to add blocks
	if( !CurrentPageId || !gridster ){
		setTimeout(function(){
			// Don't load blocks from different pages
			if ( parentPageId == location.hash.split('/')[2] ){
				drawNewBlockFromEmberHelper(b, parentPageId);
			}
		}, 400);

	// Gridster is set up and we can load it with blocks
	}else{

		// Add widget to gridster
		gridster.add_widget( generatePreviewCodeForBlock(b) ,  width,  height,  col,  row);
			
		// Load the image if there is one
		if ( b.get('image') ) {
			App.Store.find('image',  b.get('image') ).then( function(imageObj) {
						// Then when we actually have the image we'll update it on the DOM
						$("#" + b.get('image') ).attr("src", imageObj.get('imgData') ).addClass('show-image');
					});

		}

		++blockNumber; // Increment block count

	}
}



function generatePreviewCodeForBlock(block){
	var res = "";

	// It's raw html
	if ( block.get('isRawHTML') ){
		res = '<li id="' + block.get('id') + '" block-id="' + block.get('id') + '"><pre><code class="html">\n';
		res += escapeHTML(block.get('html'));
		res += "</pre></code></li>\n";

	// Not a module, and has an image
	}else if ( block.get('image') ) {
		res ='<li id="' + block.get('id') + '" block-id="' + block.get('id') + '" class="' + block.get('gridContentClasses') +
		'" ><img block-id="' + block.get('id') + '" id="'+ block.get('image') + '" src="" /><span class="html">' +
		block.get('html') + '</span><div class="draw-div"><div class="draw-text"></div></div></li>';

	// Not a module, no image
	}else{
		res = '<li id="' +  block.get('id') + '" block-id="' +  block.get('id') + '" class="' + block.get('gridContentClasses') +
		'" ><span class="html">' + block.get('html') + '</span><div class="draw-div"><div class="draw-text"></div></div></li>';
	}

	return res;
}


function escapeHTML(escapedHTML) {
	return escapedHTML.split('<').join('&lt;').split('>').join('&gt;')
}


/////////////////////////////////////////////
// Update Ember Data
/////////////////////////////////////////////

function saveBlockData(){

	// Get all gridster blocks from the DOM
	var domBlocks = $( ".gs-w" );

	// Empty blocks array we'll save back to the server later
	var dataArray = {blocks: [] };

	// Get the data for each block in the 
	for (var i = 0; i < domBlocks.length; ++i){

		// Get te DOM element
		var domElement = $( "#" + domBlocks[i].id );

		var newData = { id: domBlocks[i].id };

		newData[previewState + 'Col'] = 	domElement.attr('data-col');
		newData[previewState + 'Row'] = 	domElement.attr('data-row');
		newData[previewState + 'SizeX'] = 	domElement.attr('data-sizex');
		newData[previewState + 'SizeY'] = 	domElement.attr('data-sizey');

		// Update all of these records in the store
		App.Store.update('block', newData);

		// Add it to the array that we'll save to the server later
		dataArray['blocks'].push(newData);

	} // FOR LOOP

	// Save array back to the server  
	$.ajax({
		url: serverURL + '/blocks',
		type: 'PUT',
		contentType: "application/json; charset=utf-8",
		data: JSON.stringify(dataArray),
		success: function(data) {
			console.log('blocks saved!');
		},
		error: function(e) {
			alert('There was an error saving the block update. Please refresh the page and try again.');
		}
	});

} // END Update Ember data


function log(text, data){
	if (data){
		console.log(text, data);
	}else{
		console.log(text);
	}
}


// function getPageBlocks(){

// 	var blocksArray = { };

	// App.Store.find('page', CurrentPageId).then( function(page) {

	// 	var blocks = page.get('sortedBlocks');

	// 	for (var i = 0; i < blocks.length; ++i){
	// 	  log(blocks[i].get('id') + ": " + blocks[i].get('dRow') + " - " +  blocks[i].get('dCol'));
	// 	}
	// });

// }



function gridsterRemoveBlockAfterDelete(blockId){
	gridster.remove_widget ( $( '#'  + blockId ) );
}

function setModuleDraggables(){
	$( ".draggable" ).draggable({
		helper: "clone",

		containment: "#gridster-container",
		cursor: "move",
		cursorAt: { top: 5, left: 5 },
		start: function( event, ui ) {
			$('#grid-module-list-container').addClass('drag-mode');
		},
		stop: function( event, ui ) {
			//console.log('module draggable stop');
			$('#grid-module-list-container').removeClass('drag-mode');
		}
	});

	$( "#gridster" ).droppable({
		accept: ".draggable",
		hoverClass: "ui-state-hover",
		drop: function( e, ui ) {
			var g = $('#gridster').offset();
			var colPos = getBlockCountFromPx(e.clientX-g.left) + 1;
			var rowPos = getBlockCountFromPx(e.clientY-g.top) + 1;

			console.log('Pos: ' + colPos + " - " + rowPos);
			// createNewBlock( col, row, width, height, imageName, imageData, module){
			
			// console.log("e: ", e);
			// console.log('module id: ', ui.draggable.context.id);

			App.Store.find('module', ui.draggable.context.id).then(function(modObj){

				if (modObj.get('isRawHTML')){	// If raw html, handle differently
					createNewBlock( 1, rowPos, 16, 1, null, null, modObj);

				}else{		// Not raw, module is defined
					
					createNewBlock( colPos, rowPos, modObj.get('width'), modObj.get('height'), null, null, modObj);

				}
				
			});

			//createNewBlock(colPos, rowPos, );

		}
	});

}





