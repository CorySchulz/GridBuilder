

/*
  Ember App for Kohl's web page development.
  Designed and developed by Cory Schulz in 2014.
*/


////////////////////////////////////////////////////////////
//  VARIABLES
////////////////////////////////////////////////////////////

var dev;

var App;          	// App var
var User;         	// User object with data from Google auth
var auth;         	// Authenticate object for Firebase
var me;           	// Sometimes used as a global to jump function scopes
var Router;       	// Used to transitionTo different routes
var CurrentPageId;  // Current page Id

var allowPageTransition = false;  // Smoohts out transitions between tabbed pages
var allowPageId = null;

var blockHTMLEditor = null;		// These are used to keep track of html codemirror changes
var blockHTMLEditorChanged = false;

// Set preview stat to desktop by default
var desktop = 'd';
var tablet = 't';
var mobile = 'm';
var previewState = desktop;
var currentTimer;

var serverURL;
//serverURL =  "http://kohdev.metabolights.com/meta/grid";
serverURL = "http://10.3.40.225:8889/meta/grid";


// Update this link when you move the Grid Framework to a new version
var currentDesktopMinURL = "http://kohlscorporation-dev.cp.ad.kohls.com//GridFramework/v0.4/css/grid-desktop-min.css";
var desktopMin = "";
var shareLink = "http://kohlscorporation-dev.cp.ad.kohls.com/viewer/index.html?page=/buildrviewer/page-loader.asp?buildrid=";


var pageType = {};

pageType['adset'] = 1;
pageType['dept'] = 2;
pageType['landing'] = 3;




(function (window) {

/* 
  Sort algorithm for figuring out what order the 
  blocks / modules should be renderd in.
  This was super confusing to write, so if it
  makes your head hurt, you aren't the only one.
*/
var smartSortBlocks = function(a,b){
	// If the row is 
	if (a.get('dRow') - b.get('dRow') < 0){
		return -1;
	}else if (a.get('dRow') - b.get('dRow') === 0){

		if (a.get('dCol') - b.get('dCol') < 0 ){
			return -1;
		}else if (a.get('dCol') - b.get('dCol') === 0 ){
			return 0;
		}else if (a.get('dCol') - b.get('dCol') > 0 ){
			return 1;
		}

	}else if (a.get('dRow') - b.get('dRow') > 0){
		return 1;
	}
}

////////////////////////////////////////////////////////////
// App
////////////////////////////////////////////////////////////

App = Ember.Application.create({
	ready: function () {
		// Use App.Store as a variable to search the datastore
		// from outside of the app. 
		App.Store = App.__container__.lookup('store:main');

	}
});

////////////////////////////////////////////////////////////
// Router Map
////////////////////////////////////////////////////////////

Router = App.Router.map(function() {

	this.resource('user', { path: '/user' }, function() {});

	this.resource('pages', { path: '/pages' }, function() {
		this.resource('adsets', { path: '/adsets' },  function() {
			this.resource('adset', { path: '/adset/:set_id' },  function() {
				this.resource('adsetdept', { path: '/adsetdept/:dept_id' },  function() {
					this.resource('newadsetdeptpage', { path: '/newadsetdeptpage' },  function() {});
				});
				this.resource('newadsetdept', { path: '/newadsetdept' },  function() {});
			});
			this.resource('newadset', { path: '/newadset' },  function() {});
		});
		
		this.resource('dept', { path: '/dept' },  function() {
			this.resource('newdept', { path: '/newdept' },  function() {});
		});
		this.resource('landing', { path: '/landing' },  function() {
			this.resource('newlanding', { path: '/newlanding' },  function() {});
		});
		this.resource('allpages', { path: '/allpages' },  function() {});
		this.resource('recentpages', { path: '/recentpages' },  function() {});
	});

	this.resource('modulesarchive', { path: '/modules' }, function() {
		this.resource('newmodule', { path: '/newmodule' },  function() {});
		this.resource('module', { path: '/:module_id' }, function() {});
	});
	

	this.resource('openpage', { path: '/openpage/:openpage_id' }, function() {});

	this.resource('page', { path: '/page/:page_id' }, function() {
		this.resource('block', { path: '/block/:block_id' }, function() {});
		this.resource('modules', { path: '/modules' }, function() {});
		this.resource('pagecss', { path: '/pagecss' }, function() {});
		this.resource('blockdetail', { path: '/blockdetail/:block_id' }, function() {});
		this.resource('preview', { path: '/preview' }, function() {});
		this.resource('export', { path: '/export' }, function() {
			this.resource('exporttablet', { path: '/tablet' }, function() {});
			this.resource('exportdept', { path: '/dept' }, function() {});
			this.resource('share', { path: '/share' }, function() {});
		});
 
	});

});


// Bind click event 
setTimeout(function() {
	$('#login-button').click(function(e) {
		
		//alert( $('#login-email').val() + " - " + $('#login-pw').val()  );

		var data = {};
		data['email'] = $('#login-email').val();
		data['pw'] = $('#login-pw').val();

		$.ajax({
				url: 'http://10.3.40.225:8889/users/login',
				type: 'POST',
				contentType: "application/json; charset=utf-8",
				data: JSON.stringify(data),
				success: function(data) {
					console.log('LOGIN SUCCESS: ', data);

					// Save the cookie and refresh the page
					setCookie('API_KEY', data['sessionKey'], 60);
					location.reload();

				},
				error: function(e) {
					
					console.log('LOGIN FAILED', e);

					
					if (e.status == 420){ // couldn't find the user
						alert('We could not find a user with that email address.');
					}else if(e.status == 421){ // wrong password
						alert('That was the wrong password for that email address.');
					}


				}
			});

	});
}, 500);


// Check for the key
var key = getCookie('API_KEY');
if (key && key != null && key != "null"){

	var keyObj = {};
	keyObj['sessionKey'] = key;

	$.ajax({
			url: 'http://10.3.40.225:8889/auth',
			type: 'POST',
			contentType: "application/json; charset=utf-8",
			data: JSON.stringify(keyObj),
			success: function(data) {
				
				// Save the api key in the app
				App.set('API_KEY', key );

				// Set it for all ajax calls
				$.ajaxSetup({headers: {"API_KEY": key }})

				// data['id'] = data['_id'];
				// delete data['_id'];

				App.User.set('content', {} );

				App.User.set('id',  data['_id'] );
				App.User.set('name',  data['name'] );
				App.User.set('email',  data['email'] );

				// Reset the cookie
				setCookie('API_KEY', key, 60);

				//location.reload();
				
			},
			error: function(e) {

			}
		});


}else{
	Router.transitionTo('user');
}

////////////////////////////////////////////////////////////
//  DATA STORE, REST ADAPTER, AND SERIALIZER
////////////////////////////////////////////////////////////

/* 

headers: function() {
		    return {
		      API_KEY: getCookie('API_KEY')
		    };
		 }.property("App.API_KEY"),


*/


App.ApplicationStore = DS.Store.extend({
   adapter: DS.RESTAdapter.extend({
        host: serverURL,
        headers: {
		      API_KEY: getCookie('API_KEY')
		},
        updateRecord: function(store, type, record) {
            var data = {};
            var serializer = store.serializerFor(type.typeKey);

            serializer.serializeIntoHash(data, type, record);

            var id = record.get('id');
            var url =  this.buildURL(type.typeKey, id);

            // We're going to handle block updating manually in the gridster-app
            // if (type.typeKey == 'block'){
            // 	log("***************** Block save was overriden! ***********");
            // 	//alert('block saving stuff');
            // 	// Here we're pretty much returning a promise and resolving it to true right away.
            //    return new Ember.RSVP.Promise(function(resolve, reject) { resolve(1); });
            // }

			$.ajax({
				url: url,
				type: 'PUT',
				contentType: "application/json; charset=utf-8",
				data: JSON.stringify(data),
				success: function(data) {
					//console.log('SUCCESS: ', data);
				},
				error: function(e) {
					alert('There was an error updating data on the server.');
					console.log('PUT FAILED', e);
				}
			});
         
            return new Ember.RSVP.Promise(function(resolve, reject) { resolve(1); });
            
        } // updateRecord: 

     })  // DS.RESTAdapter.extend({
});   // App.ApplicationStore = DS.Store.extend({

// Tell Ember Data to ues '_id' instead of 'id'
App.ApplicationSerializer = DS.RESTSerializer.extend({
	primaryKey: '_id'
});


////////////////////////////////////////////////////////////
//  EMBER MODELS
////////////////////////////////////////////////////////////


App.CurrentPageName = Ember.Object.extend({
	name: ""
});

App.Page = DS.Model.extend({
	pageName:        	DS.attr('string'),

	createdDate: 		DS.attr('number'),
	createdById:      	DS.attr('string'),
	createdByName: 		DS.attr('string'),

	liveDate: 			DS.attr('string'),
	pageType: 			DS.attr('number'),
	adSetDept: 			DS.belongsTo('adSetDept', {   async: true } ),
	adSet: 				DS.attr('string'),
	wmjLink:			DS.attr('string'),
	desktopMinURL: 		DS.attr('string'),

	createdDate: function() {
		return moment(this.get('createdOn')).format('MMMM Do, YYYY');
	}.property('createdOn'),


	pageCSS:			DS.attr('string'),
	pageHTML:			DS.attr('string'),
	pageImages:			DS.hasMany('image', {   async: true }),
	pageSharedDate:		DS.attr('string'),
	pageShareLink:		DS.attr('string'),

	blocks:   			DS.hasMany('block', {   async: true }),

	fileName:			DS.attr('string'),
	developer:			DS.attr('string'),
	designer:			DS.attr('string'),
	prodSpecialist:		DS.attr('string')
  
});



/* images:   DS.hasMany('image', {   async: true } ) */

/*  blocks: DS.hasMany('block')  */

App.Block = DS.Model.extend({

	moduleId:  	DS.attr('string'),
	moduleName: DS.attr('string'),
	image:    	DS.attr('string'),
	imageName: 	DS.attr('string'),
	imageAlt: 	DS.attr('string'),
	html: 		DS.attr('string'),

	gridBoxClasses: 		DS.attr('string'),
	gridContentClasses: 	DS.attr('string'),
	isRawHTML: 				DS.attr('boolean'),

	gridContentURL: 		DS.attr('string'),
	boxContentIsAnchor: 	DS.attr('boolean'),

	dCol:   	DS.attr('number'),
	dRow:   	DS.attr('number'),
	dSizeX: 	DS.attr('number'),
	dSizeY: 	DS.attr('number'),

	mCol:   	DS.attr('number'),
	mRow:   	DS.attr('number'),
	mSizeX: 	DS.attr('number'),
	mSizeY: 	DS.attr('number'),

	dBorderT: 	DS.attr('boolean'),
	dBorderB: 	DS.attr('boolean'),
	dBorderL: 	DS.attr('boolean'),
	dBorderR: 	DS.attr('boolean'),

	mBorderT: 	DS.attr('boolean'),
	mBorderB: 	DS.attr('boolean'),
	mBorderL: 	DS.attr('boolean'),
	mBorderR: 	DS.attr('boolean'),

	watchBorders: function(e){
		this.save().then(function( blockObj ) {
			}, function( resp ) {
				alert('There was an error saving a border update for your blocks.\nPlease refresh the page and try again.');
			});
	}.observes('dBorderT', 'dBorderB', 'dBorderL', 'dBorderR'),

	getBlockCode: function(e){
		var res = "";
		var me = this;

		if (this.get('isRawHTML')){
			res += this.get('html') + "\n";
			return res;
		}else{

			// **************** GRID-BOX and d*x* size
			res += '<div class="grid-box d' + this.get('dSizeX') + 'x' + this.get('dSizeY');
			if ( this.get('gridBoxClasses') ){
				res += ' ' + this.get('gridBoxClasses');
			}
			res += '" >'; // **************** / GRID-BOX

			// If this is an anchor tage
			if (this.get('boxContentIsAnchor')){

				res += '<a href="' + this.get('gridContentURL') + '" class="box-content ';
				if(this.get('gridContentClasses')){
					res += ' ' + this.get('gridContentClasses');
				}

			}else{ // Not an anchor tag
				res += '<div class="box-content ';
				if(this.get('gridContentClasses')){
					res += ' ' + this.get('gridContentClasses');
				}
			}

			// Add borders for each size
			if (this.get('dBorderT') ){ res += ' d-border-top'; }
			if (this.get('dBorderB') ){ res += ' d-border-bottom'; }
			if (this.get('dBorderL') ){ res += ' d-border-left'; }
			if (this.get('dBorderR') ){ res += ' d-border-right'; }

			res  += '" >\n'; // Close box content line

			// It's not a nav box, but it does have a link
			if ( !this.get('boxContentIsAnchor') && this.get('gridContentURL') ){
				res += '<a href="' + this.get('gridContentURL') + '" >';
			}

			// Get image if we have it
			if (this.get('image')){

					var imgName = "http://media.kohls.com.edgesuite.net/is/image/kohls/" + this.get('imageName');

					imgName = imgName.replace(".jpg", "?scl=1&fmt=pjpeg&qlt=40,1");
					imgName = imgName.replace(".png", "?scl=1&fmt=png-alpha");
					imgName = imgName.replace(".gif", "?scl=1&fmt=gif-alpha");

					res += '<img src="' + imgName + '" class="box-bg-image" id="' + this.get('image') + '" alt="' ; 

					if ( this.get('imageAlt') ){
						res +=  this.get('imageAlt');
					}

					res += '" />\n';
					
			}

			// Add HTML is there is some
			if (this.get('html') ){
				res += this.get('html');
			}

			// It's not a nav box, but it does have a link, we need to close it
			if ( !this.get('boxContentIsAnchor') && this.get('gridContentURL') ){
				res += '</a>';
			}
			
			// Closing tags
			if (this.get('boxContentIsAnchor')){
				res += '\n</a></div>\n'; 	// Close anchor box-content and grid-box divs
			} else{
				res += '\n</div></div>\n'; // Close box-content and grid-box divs
			}

			// Return code
			return res;

		}

	}.property('html', 'dBorderT', 'dBorderB', 'dBorderL', 'dBorderR', 'image', 'moduleId', 'gridBoxClasses', 
		'gridContentClasses', 'dCol', 'dRow', 'dSizeX', 'dSizeY', 'imageAlt', 'gridContentURL')

});

App.Module = DS.Model.extend({
	name:  		DS.attr('string'),
	width: 		DS.attr('number'),
	height: 	DS.attr('number'),
	html:  		DS.attr('string'),
	isRawHTML: 	DS.attr('boolean'),

	gridBoxClasses: 		DS.attr('string'),
	gridContentClasses: 	DS.attr('string'),
	boxContentIsAnchor: 	DS.attr('boolean')
});

App.Image = DS.Model.extend({
	imgName:  	DS.attr('string'),
	imgData:  	DS.attr('string')
});

App.AdSet = DS.Model.extend({
	date:  		DS.attr('string'),
	label:  	DS.attr('string'),
	depts: 		DS.hasMany('adSetDept', {   async: true } )
});

App.AdSetDept = DS.Model.extend({
	label:  	DS.attr('string'),
	pages: 		DS.hasMany('page', 		{   async: true } )
});



////////////////////////////////////////////////////////////
//   OBJECTS 
////////////////////////////////////////////////////////////
App.authToken = Ember.ObjectController.create({});
App.OpenPages = Ember.ArrayController.create({});
App.SelectedPage = Ember.ObjectController.create({});
App.SelectedBlock = Ember.ObjectController.create({});
App.SelectedBlockImage = Ember.ObjectController.create({});
App.SelectedAdSet = Ember.ObjectController.create({});
App.SelectedAdSetDept = Ember.ObjectController.create({});
App.OpenModule = Ember.ObjectController.create({});

App.RecentPages = Ember.ArrayController.create([]);



App.User = Ember.ObjectController.create({
	uid: "",
	displayName: "",
	email:  "",
	name: ""
});

App.CodeGen = Ember.ObjectController.create({
	landingCSS: "",
	landingHTML: "",
	deptCSS: "",
	deptHTML: "",
	previewCode: ""
});



////////////////////////////////////////////////////////////
//  INDEX
////////////////////////////////////////////////////////////

App.IndexRoute = Ember.Route.extend({
	redirect: function() {
		this.transitionTo('pages');
	},
	setupController: function(controller, model) {
		controller.set('model', model); 	
	}
});


////////////////////////////////////////////////////////////
//  USER
////////////////////////////////////////////////////////////

App.UserRoute = Ember.Route.extend({
  model: function() {
	return App.User
  },
   setupController: function(controller, model) {
	
	// Set model
	controller.set('model', model);
  },
  actions:{
		logout: function(e){
			if (confirm("Are you sure you want to log out?")) {
			    setCookie('API_KEY', null, 60);
			    location.reload();
			}
		}
	}
});



////////////////////////////////////////////////////////////
//  PAGES
////////////////////////////////////////////////////////////

App.PagesRoute = Ember.Route.extend({
  model: function() {
  	if (App.User.get('content') == null){
  		this.transitionTo('user');
  	}
	return this.store.find('page');
  },
   setupController: function(controller, model) {
	// Reset Gridster just in case
	if (gridster){
	  	gridster.remove_all_widgets();
	  	gridster.destroy();
	  	gridster = null;
    	}

	// Set model
	controller.set('model', model);
  },
  actions:{
		login: function(e){
			alert('pages login');
			console.log( $('#login-email').val() );
			console.log( $('#login-pw').val() );
		}
	}
});



////////////////////////////////////////////////////////////
//  PAGES / AD SETS
////////////////////////////////////////////////////////////

App.AdsetsRoute = Ember.Route.extend({
	model: function() {
		return this.store.find('adSet');
	},
	setupController: function(controller, model) {

		model = model.sortBy('date');

		// Set model
		controller.set('model', model);
	}
});

////////////////////////////////////////////////////////////
//  PAGES / AD SET
////////////////////////////////////////////////////////////

App.AdsetRoute = Ember.Route.extend({
	model: function(params) {
		console.log('Getting ad set');
		return this.store.find('adSet', params.set_id );
	},
	setupController: function(controller, model) {
		
		// model  = model.filter(function(item, index, enumerable) {
		//   	return item.get('pageType') == 2;
		// });

		//model = this.store.find('adSetDept', )
		
		App.SelectedAdSet.set('content', model);

		// Set model
		console.log('test', model.get('depts') );

		controller.set('model', model.get('depts') );
	}
});

////////////////////////////////////////////////////////////
//  PAGES / AD SET DEPT
////////////////////////////////////////////////////////////

App.AdsetdeptRoute = Ember.Route.extend({
	model: function(params) {
		return this.store.find('adSetDept', params.dept_id);
	},
	setupController: function(controller, model) {

		App.SelectedAdSetDept.set('content', model);

		model = model.get('pages');

		// Set model
		controller.set('model', model);
	}
});


////////////////////////////////////////////////////////////
//  PAGES / DEPT
////////////////////////////////////////////////////////////

App.DeptRoute = Ember.Route.extend({
	model: function() {
		return this.store.find('page');
	},
	setupController: function(controller, model) {
		// Get pages of type 1 (Department)
		model = model.filter(function(item, index, enumerable) {
			return item.get('pageType') == 2;
		});

		// Set model
		controller.set('model', model );
	}
   
});



////////////////////////////////////////////////////////////
//  PAGES / LANDING
////////////////////////////////////////////////////////////

App.LandingRoute = Ember.Route.extend({
	model: function() {
		return this.store.find('page');
	},
	setupController: function(controller, model) {
		
		// Get pages of type 2 (Landing pages)
		model = model.filter(function(item, index, enumerable) {
			return item.get('pageType') == 3;
		});

		// Set model
		controller.set('model', model);
	}
});


////////////////////////////////////////////////////////////
//  PAGES / ALL PAGES
////////////////////////////////////////////////////////////

App.AllpagesRoute = Ember.Route.extend({
	model: function() {
		return this.store.find('page');
	},
	setupController: function(controller, model) {
		// Set model
		controller.set('model', model);
	}
});

////////////////////////////////////////////////////////////
//  PAGES / RECENT PAGES
////////////////////////////////////////////////////////////

App.RecentpagesRoute = Ember.Route.extend({
	model: function() {
		return App.RecentPages;
	},
	setupController: function(controller, model) {
		// Set model
		controller.set('model', model);
	}
});

////////////////////////////////////////////////////////////
//  PAGES / NEW LANDING
////////////////////////////////////////////////////////////

App.NewlandingRoute = Ember.Route.extend({
  model: function() {
	return null;
  },
   setupController: function(controller, model) {

   	$( document ).unbind('keyup');
	$( document ).unbind('keydown');

	// Show Modal
	setModalPanel('landing');
	
  },
  actions: {
  	createLanding: function(e){

  			if ($('#new-page-name').val().trim().length == 0 ){

				alert('Please give the page a name!');
				$('#new-page-name').focus();

			}else{

				var newLP = App.Store.createRecord('page', {} );

				newLP.set('pageName', $('#new-page-name').val() );
				newLP.set('createdDate', Date.now() );
				newLP.set('liveDate', $('#new-page-date').val()  );
				newLP.set('createdByName', App.User.get('name') );
				newLP.set('createdById', App.User.get('id'));
				newLP.set('pageType', 3);
				newLP.set('pageCSS', "");

				newLP.save().then(function( pageObj ) {

						Router.transitionTo('page', pageObj.get('id')  );

					}, function(resp) {

						log("Save Error: ", resp );
					
					});


				$('.modal-wrapper').removeClass('show-modal');

				setTimeout(function() {
					$('.modal-wrapper').hide();
					$('.modal-results-panel').addClass('show-modal');
				}, 200);
			}


  	}

  }

});




////////////////////////////////////////////////////////////
//  PAGES / NEW DEPT
////////////////////////////////////////////////////////////

App.NewdeptRoute = Ember.Route.extend({
	model: function() {
		return null
	},
	setupController: function(controller, model) {

	setTimeout(function() {
		
		setModalPanel('dept');

		// Set focus to text field after it shows up
		$('#new-page-name').focus();

	}, 200);

	},
	actions: {
		createNewDept: function() {
			if ($('#new-page-name').val().trim().length == 0 ){

				alert('Please give the page a name!');
				$('#new-page-name').focus();

			}else{

				var newDP = App.Store.createRecord('page', {} );

				newDP.set('pageName', $('#new-page-name').val() );
				newDP.set('createdDate', Date.now() );
				newDP.set('liveDate', $('#new-page-date').val() );
				newDP.set('createdByName', App.User.get('name') );
				newDP.set('createdById', App.User.get('id'));
				newDP.set('pageType', 2);
				newDP.set('pageCSS', "");

				newDP.save().then(function( pageObj ) {
						Router.transitionTo('page', pageObj.get('id')  );
					}, function(resp) {
						log("Save Error: ", resp );
					});


				$('.modal-wrapper').removeClass('show-modal');

				setTimeout(function() {
					$('.modal-wrapper').hide();
					$('.modal-results-panel').addClass('show-modal');
				}, 200);
			}
			
		}

	}
});

////////////////////////////////////////////////////////////
//  PAGES / NEW AD SET
////////////////////////////////////////////////////////////

App.NewadsetRoute = Ember.Route.extend({
  model: function() {
	return null;
  },
   setupController: function(controller, model) {

   	setModalPanel('adsets');
	
  },
  actions: {
		createNewAdSet: function() {

			if ($('#new-ad-set-date').val().trim().length == 0){
				alert('You must first enter a valid date to create a new ad set.');
			}else{
				var newAdSet = App.Store.createRecord( 'adSet', {} );
				var date = $('#new-ad-set-date').val();

				newAdSet.set('date', date );
				date = date.split('-');

				newAdSet.set('label', date[1] + "/" + date[2] );

				newAdSet.save().then( function( adSetObj ) {

						Router.transitionTo( 'adset', adSetObj.get('id') );

					}, function(resp) {

						alert('There was an error creating your new ad set.');
						Router.transitionTo( 'adsets' );
					
					});
			}
		}
	}
});


////////////////////////////////////////////////////////////
//  PAGES / NEW AD SET DEPT
////////////////////////////////////////////////////////////

App.NewadsetdeptRoute = Ember.Route.extend({
	model: function() {
		return null;
	},
	setupController: function(controller, model) {
		setModalPanel('adset');
	},
	actions: {
		createNewAdSetDept: function(e) {

			var newDept = App.Store.createRecord( 'adSetDept', {} );

			// Set the label to the dept value
			newDept.set('label', e );
			
			// Save the new department category
			newDept.save().then( function( newDeptObj ) {

					// Add it to the selected ad set and save it
					App.SelectedAdSet.get('depts').pushObject(newDeptObj);
					App.SelectedAdSet.get('content').save();

					Router.transitionTo( 'adsetdept', newDeptObj.get('id') );
					
				}, function(resp) {

					alert('There was an error creating your new ad set department.');
					Router.transitionTo( 'adsets' );
				});
			
		}

	}
});


////////////////////////////////////////////////////////////
//  PAGES / NEW AD SET DEPT PAGE
////////////////////////////////////////////////////////////
App.NewadsetdeptpageRoute = Ember.Route.extend({
	model: function() {
		return null
	},
	setupController: function(controller, model) {
		setModalPanel('adsetdept');
	},
	actions: {
		createNewAdSetDeptPage: function(e) {

			var newDeptPage = App.Store.createRecord( 'page', {} );
			newDeptPage.set('pageType', 1);

			newDeptPage.set('pageName', $('#new-page-name').val() );
			newDeptPage.set('createdDate', Date.now() );
			newDeptPage.set('liveDate', $('#new-page-date').val() );
			newDeptPage.set('createdByName', App.User.get('name') );
			newDeptPage.set('createdById', App.User.get('id'));
			newDeptPage.set('adsetdept', App.SelectedAdSetDept.get('content') );
			newDeptPage.set('pageCSS', "");

			newDeptPage.save().then( function( pageObj ) {

					App.SelectedAdSetDept.get('pages').pushObject(pageObj);
					App.SelectedAdSetDept.get('content').save();
					Router.transitionTo( 'page', pageObj.get('id') );
					
				}, function(resp) {

					alert('There was an error creating your new ad set department page.');
					Router.transitionTo( 'adsets' );
				});
		}
	}
});

////////////////////////////////////////////////////////////
//  PAGE CSS
////////////////////////////////////////////////////////////

App.PagecssRoute = Ember.Route.extend({
	model: function() {
		return App.Store.find('page', CurrentPageId);
	},
	setupController: function(controller, model) {
		controller.set('model', model);

		setTimeout(function() {
	
			blockHTMLEditor = CodeMirror(document.getElementById("page-css"), {
				mode: "text/css",
				extraKeys: {"Ctrl-Space": "autocomplete"},
				lineNumbers: true,
				lineWrapping: true,
				tabSize: 2,
				value: ''
	        });

			// If the text changes, mark it as dirty so it gets saved later
	        blockHTMLEditor.on('changes', function(e) {
	        	blockHTMLEditorChanged = true;
			});
		
			// Refresh the text in the code editor
			if (model.get('pageCSS')){
				blockHTMLEditor.setValue(model.get('pageCSS'));
			}else{
				blockHTMLEditor.setValue("");
			}

			// Tell the DOM to refresh the CodeMirror box
			blockHTMLEditor.refresh();

        }, 300);

		// Clear interval timer if it still exists from a previous page.
        if(currentTimer){
    		clearInterval(currentTimer);
    		delete currentTimer;
    		currentTimer = null;
        }

        // Set timer to check html and save it every second
        currentTimer = setInterval( function(){
    		if (blockHTMLEditorChanged){

    			blockHTMLEditorChanged = false;
    			model.set('pageCSS', blockHTMLEditor.getValue() );

    			$('#global-page-styles')[0].innerHTML = blockHTMLEditor.getValue();

    			// Save block
    			model.save().then(function( blockObj ) {
    				
					}, function(resp) {
						//alert('There was an error saving the html text in your block.\nPlease refresh the page and try again.');
					});
    		}
        }, 1000);


	}
});

////////////////////////////////////////////////////////////
//  OPEN PAGE
////////////////////////////////////////////////////////////

App.OpenpageRoute = Ember.Route.extend({
	model: function(params) {
		console.log('open page params: ' + params.openpage_id);
		console.log(gridster);

		gridster.remove_all_widgets();
		gridster.destroy();

		setTimeout(function(){
			Router.transitionTo('page', params.openpage_id );
		}, 500);
		
		return null;
	},
	setupController: function(controller, model) {
		
		//Router.transitionTo('page', CurrentPageId );

	}
});


////////////////////////////////////////////////////////////
//  MODULES
////////////////////////////////////////////////////////////
App.ModulesRoute = Ember.Route.extend({
	model: function() {
		return App.Store.find('module');
	},
	setupController: function(controller, model) {
		controller.set('model', model);
		setTimeout(function(){
			setModuleDraggables();
		}, 500);
	}
});

////////////////////////////////////////////////////////////
//  MODULES ARCHIVE
////////////////////////////////////////////////////////////
App.ModulesarchiveRoute = Ember.Route.extend({
	model: function() {
		return App.Store.find('module');
	},
	setupController: function(controller, model) {
		controller.set('model', model);
	}
});


////////////////////////////////////////////////////////////
//  MODULE
////////////////////////////////////////////////////////////
App.ModuleRoute = Ember.Route.extend({
	model: function(params) {
		return App.Store.find('module', params.module_id);
	},
	setupController: function(controller, model) {
		controller.set('model', model);

		App.OpenModule.set('content', model);

		setTimeout(function() {

			// Don't make another html codemirror unless we really have to
			if ( blockHTMLEditor && $('#blockHTMLEditor').html() ){
				blockHTMLEditor.setValue('');

			}else{

				blockHTMLEditor = CodeMirror(document.getElementById("blockHTMLEditor"), {
					mode: "text/html",
					extraKeys: {"Ctrl-Space": "autocomplete"},
					lineNumbers: true,
					tabSize: 2,
					value: ''
		        });

		        blockHTMLEditor.on('changes', function(e) {
				    blockHTMLEditorChanged = true;
				});
			}

			// Refresh the text in the code editor
			if (App.OpenModule.get('html')){
				blockHTMLEditor.setValue( App.OpenModule.get('html') );
			}

        }, 200);

        setInterval( function(){
    		if (blockHTMLEditorChanged){
    			blockHTMLEditorChanged = false;

    			App.OpenModule.set('html', blockHTMLEditor.getValue() );

    			App.OpenModule.get('content').save().then(function( modObj ) {
    					console.log("Saved html", modObj);
					}, function(resp) {
						alert('There was an error saving the module.\nPlease refresh the page and try again.');
					});

    		}
        }, 1000);

	},
	actions: {
		updateModule: function(){
			console.log('update Module');
			App.OpenModule.get('content').save().then(function(modObj){
					console.log('module saved');
				}, function(resp) {
					alert('There was an error saving the module.\nPlease refresh the page and try again.');
				});
		},
		contentElement: function(e){
			//console.log('contact Element update run');
			App.OpenModule.toggleProperty('boxContentIsAnchor');
			App.OpenModule.get('content').save().then(function(modObj){
					console.log('module saved');
				}, function(resp) {
					alert('There was an error saving the module.\nPlease refresh the page and try again.');
				});
		},
		willTransition: function(){
			console.log('module editor will transition');
			App.OpenModule.get('content').save().then(function(modObj){
					console.log('module saved');
				}, function(resp) {
					alert('There was an error saving the module.\nPlease refresh the page and try again.');
				});

			App.OpenModule.set('content', null);
		}
	}

});


////////////////////////////////////////////////////////////
//  NEW MODULE
////////////////////////////////////////////////////////////
App.NewmoduleRoute = Ember.Route.extend({
	model: function(params) {
		return null;
	},
	setupController: function(controller, model) {
		controller.set('model', model);
		setModalPanel('modulesarchive');
	},
	actions: {
		createNewModule: function() {

			if ( $('#new-module-name').val().trim().length == 0 ){

				alert('Please give the module a name!');
				$('#new-module-name').focus();

			}else{
				
				var newMod = App.Store.createRecord('module', {} );

				newMod.set('name', $('#new-module-name').val().trim() );
				
				newMod.save().then(function( modObj ) {
						Router.transitionTo('module', modObj.get('id')  );
					}, function(resp) {
						log("Module Save Error: ", resp );
					});

			}

		}
	}

});


////////////////////////////////////////////////////////////
//  PAGE
////////////////////////////////////////////////////////////
App.PageRoute = Ember.Route.extend({
	model: function(params) {
		CurrentPageId = params.page_id;
		return this.store.find('page', params.page_id);
	},
	setupController: function(controller, model) {

		App.SelectedPage.set('content', model);

		// Fades gridster out a bit
		$('#gridster').removeClass('showGrid');

		$('#app-container').animate({
			scrollTop: 0
		}, 300, 'easeOutExpo');

		CurrentPageId = model.get('id');

		updateRecentPages(CurrentPageId);

		// If this app isn't on the list of open pages, open it
		if (! App.OpenPages.contains(model) ){
		    App.OpenPages.pushObject(model);
		}

		// If a gridster exists, clear it out
		if (gridster){
			log('there is a gridster');

			//gridster.remove_all_widgets();
			gridster.destroy();
		}else{
			log('NO gridster');
		}

		App.SelectedBlock.set('content', null );

		// Chill out for 500 milliseconds while the DOM renders
		setTimeout(function() {

			CurrentPageId = model.get('id');

			// Tell Gridster to bind to the DOM now that it exists
			setGridster();

			$('#global-page-styles')[0].innerHTML = model.get('pageCSS');
			
			setTimeout(function() {

				// Set controller model (this is the default to set things up)
				if (gridster.$widgets.length > 0){
					//alert("Gridster exists?");
				}

				controller.set('model', model);

				$('#gridster').addClass('showGrid');

				resetTabBarEvents();
				
			}, 400);

		}, 400);

	},
	actions: {
		updatePage: function() {
			App.Store.find('page', CurrentPageId).then(function(currentPage) {
				currentPage.save().then(function( pageObj ) {}, function(resp) {});
			});
		},
		deletePage: function() {
			var d = prompt("Are you sure you want to delete this page? \nType 'delete' to confirm.", "");
			var PID = App.SelectedPage.get('id');
			
			// If d has a value and when we trim it it's equal to "delete"
			if (d && d.trim() == "delete"){

				if (confirm("This page will now be deleted!")){
					
					// Go to pages
					Router.transitionTo('pages');

					// Remove the page from the open pages array
					App.OpenPages.removeObject( App.SelectedPage.get('content') );

					// Get the blocks as an array
					var blocks = App.SelectedPage.get('blocks').toArray();
					
					// Delete each block
					for(var i = 0; i < blocks.length; ++i){

						// If image, delete image too
						if (blocks[i].get('image')){

							// Find the image
							App.Store.find('image', blocks[i].get('image')).then( function(img) {
									// Delete the imate
									img.destroyRecord();

								}, function(resp) {
									console.log("couldn't delete the image");

								});

						}

						// Destroy Block
						blocks[i].destroyRecord();
			
					}  // For Loop

					// Wait and then destroy this page after everything else has been deleted
					setTimeout(function() {
						App.Store.find('page', PID).then( function(page) {
							App.SelectedPage.set('content', null);
							// Finally, Delete the page
							page.destroyRecord();
						});
					}, 1000);

				}else{
					// Not deleted
					alert('Your page was not deleted.');
				}

			}

		},
		deleteBlock: function() {

			// Get current page and remove block
			App.Store.find('page', CurrentPageId).then( function(page) {

				// Get the block
				App.Store.find('block',  App.SelectedBlock.get('id')  ).then( function(block) {

					// If the block has an image, find and destroy it
					if ( block.get('image') ){
						App.Store.find('image',  block.get('image') ).then( function(image) {
							image.destroyRecord(); 
						});
					}

					// Remove the block from the page and save the page to the server
					page.get('blocks').removeObject(block);
					page.save().then(function(data) {
							
							// Then delete the block from gridster
							gridsterRemoveBlockAfterDelete( block.get('id') );

							// Delete the block from the database and commit to the server
							block.destroyRecord(); 

							// Transition away from /blockdetail/:block_id hash path
							Router.transitionTo('page', CurrentPageId );

							// Make sure the block we deleted is no longer the selected block
							App.SelectedBlock.set('content', null );

						}, function(resp) {
							// Save didn't work, try again
							page.save();
							
						});
				
				});


			});

		},
		willTransition: function(t){  // Handles the transiiton between pages from the top tabs
			// If we're going to a different page, unload Gridster
			willTransitionToPage(t);

		}
	}

});



function willTransitionToPage(t){

		// If we're going a page but it doesn't have the current page ID in it
		if (t.targetName == "page.index" && t.intent.contexts[0].id != CurrentPageId){

		
			//if (allowPageTransition == false){

				// Hide the gridster right away
				$('#gridster').removeClass('showGrid');

				// Save this Id to transition to in a second
				//allowPageId = t.intent.contexts[0].id;

				// Wait for the gridster div to fade out
				setTimeout(function() {
					// Clear and destroy gridster and then fade it out
					gridster.remove_all_widgets();
					gridster.destroy();

					setTimeout(function() {
						Router.transitionTo('openpage',  t.intent.contexts[0].id );
					}, 200);

				},  500);

				// Abort this transition, we'll call it again in a second
				t.abort();
			
		}
}




////////////////////////////////////////////////////////////
//  BLOCK MODEL
////////////////////////////////////////////////////////////

App.BlockRoute = Ember.Route.extend({
	model: function(params) {
		return this.store.find('block', params.block_id);
	},
	setupController: function(controller, model) {

		// Set controller model (this is the default to set things up)
		controller.set('model', model);

		// Chill out for 500 milliseconds while the DOM renders
		setTimeout(function() {
		  $( "#block-modal-bg" ).click(function(e) {
		          Router.transitionTo('page');
		  });
		}, 800);

	}
});


////////////////////////////////////////////////////////////
//  BLOCK DETAIL
////////////////////////////////////////////////////////////

App.BlockdetailRoute = Ember.Route.extend({
	model: function(params) {
		return this.store.find('block', params.block_id);
	},
	setupController: function(controller, model) {

		// Set controller model (this is the default to set things up)
		controller.set('model', model);

		// Set the selected block with the one we're going to
		App.SelectedBlock.set('content', model);

		// Get the image if it has it
		if ( App.SelectedBlock.get('image') ){
			App.Store.find('image',  App.SelectedBlock.get('image') ).then( function(imageObj) {
				// Then when we actually have the image we'll update it on the DOM
				App.SelectedBlockImage.set('content', imageObj );
			});

		}

		setTimeout(function() {

			// Don't make another html codemirror unless we really have to
			if (blockHTMLEditor && $('#blockHTMLEditor').html().trim().length > 0){
				blockHTMLEditor.setValue('');
			}else{
				blockHTMLEditor = CodeMirror(document.getElementById("blockHTMLEditor"), {
		          mode: "text/html",
		          extraKeys: {"Ctrl-Space": "autocomplete"},
		          lineNumbers: true,
		          lineWrapping: true,
		          tabSize: 2,
		          value: ''
		        });

		        blockHTMLEditor.on('changes', function(e) {
		        	if (App.SelectedBlock.get('isRawHTML')){
		        		$('#' + App.SelectedBlock.get('id') + ' .html').text(blockHTMLEditor.getValue());
		        	}else{
		        		//$('#' + App.SelectedBlock.get('id') + ' .html')[0].innerHTML = blockHTMLEditor.getValue();
		        		$('#' + App.SelectedBlock.get('id') + ' .html').html(blockHTMLEditor.getValue());
		        	}	
				    blockHTMLEditorChanged = true;
				});
			}

			// Set the text in the code editor
			if (App.SelectedBlock.get('html')){
				blockHTMLEditor.setValue(App.SelectedBlock.get('html'));
			}

			if ( !App.SelectedBlock.get('isRawHTML') ){
				
				var detailsImageDrop = document.getElementById('details-drop-image');

				detailsImageDrop.addEventListener('dragenter', stopPropagation, false);
				detailsImageDrop.addEventListener('dragexit', stopPropagation, false);
				detailsImageDrop.addEventListener('dragover', stopPropagation, false);
				detailsImageDrop.addEventListener('drop', imageUpdated, false);

			}

			// wait and make sure the code editor refreshes
			setTimeout( function() {
				blockHTMLEditor.refresh();
			}, 300);

        }, 300);

		// Clear interval timer if it still exists for some reason.
        if(currentTimer){
    		clearInterval(currentTimer);
    		currentTimer = null;
        }

        // Set timer to check html and save it every second
        currentTimer = setInterval( function(){
    		if (blockHTMLEditorChanged){
    			blockHTMLEditorChanged = false;
    			App.SelectedBlock.set('html', blockHTMLEditor.getValue() );

    			// Save block
    			App.SelectedBlock.get('content').save().then(function( blockObj ) {
    				
					}, function(resp) {
						//alert('There was an error saving the html text in your block.\nPlease refresh the page and try again.');
					});
    		}
        }, 1000);


	},
	actions: {
		updateBlock: function(e) {

			App.SelectedBlock.get('content').save().then(function( blockObj ) {
					console.log('block was saved');
				}, function(resp) {
					alert('There was an error saving an update for your page.\nPlease refresh the page and try again.');
				});

			return false;
		},
		updateBlockAndClasses: function(e) {

			$('#' + App.SelectedBlock.get('id')).attr('class', 'gs-w selected-block ' + App.SelectedBlock.get('gridBoxClasses') );
			$('#' + App.SelectedBlock.get('id') + ' .html').attr('class', "html " + App.SelectedBlock.get('gridContentClasses') );

			App.SelectedBlock.get('content').save().then(function( blockObj ) {
					console.log('block was saved');
				}, function(resp) {
					alert('There was an error saving an update for your page.\nPlease refresh the page and try again.');
				});

			return false;
		},
		toggleDesktopTop: function() {
			App.SelectedBlock.toggleProperty('dBorderT');
		},
		toggleDesktopBottom: function() {
			App.SelectedBlock.toggleProperty('dBorderB');
		},
		toggleDesktopLeft: function() {
			App.SelectedBlock.toggleProperty('dBorderL');
		},
		toggleDesktopRight: function() {
			App.SelectedBlock.toggleProperty('dBorderR');
		},

		willTransition: function(t){ 

			clearInterval(currentTimer);
    		currentTimer = null;

			// Save any code up dates if some were made in the last second
			if (blockHTMLEditorChanged){
				App.SelectedBlock.set( 'html', blockHTMLEditor.getValue() );
				blockHTMLEditorChanged = false;
				App.SelectedBlock.get('content').save().then(function( blockObj ) {
					}, function(resp) {
						//alert('There was an error saving the html text in your block.\nPlease refresh the page and try again.');
					});
			}
		
		}


	}

});


////////////////////////////////////////////////////////////
//  PREVIEW PAGE
////////////////////////////////////////////////////////////
App.PreviewRoute = Ember.Route.extend({
	model: function() {
		return null;
	},
	setupController: function(controller, model) {
		// Wait for blocks to load and then update the shared html
		setTimeout(function(){
			updateShareLink();
		}, 500);
	}
});


////////////////////////////////////////////////////////////
//  EXPORT 
////////////////////////////////////////////////////////////
App.ExportRoute = Ember.Route.extend({
	model: function(params) {	
		Router.transitionTo('exporttablet');
		return null;
	},
	setupController: function(controller, model) {

		// Wait for blocks to load
		setTimeout(function(){

			// Get the desktop-min css and add it to the preview
			$.ajax({
			    url: currentDesktopMinURL,
			    dataType: "text",
			    success: function(code) {
			    	desktopMin = code;
			    	// Set the css
			    	App.CodeGen.set('landingCSS', desktopMin + '\n\n\n/* CUSTOM PAGE CSS */\n\n' + App.SelectedPage.get('pageCSS') );
			    	
			  //   	setTimeout(function(){
					// 	getHTMLByBlock(App.SelectedPage.get('id'));
					// 	setTimeout(function(){
					// 		generateHTMLByModule();
					// 	}, 500);
					// }, 100);

			    }
			});

		}, 500);

	}
});



////////////////////////////////////////////////////////////
//  SHARE PAGE
////////////////////////////////////////////////////////////
App.ShareRoute = Ember.Route.extend({
	model: function(params) {
		return App.SelectedPage;
	},
	setupController: function(controller, model) {
		controller.set('model', App.SelectedPage );
	},
	actions: {

		updateShareLink: function(){

			updateShareLink();

		}
	}
});

// Generate the html and update the share link
function updateShareLink(){

		// Generate the dept modules
		generateHTMLByModule();

		// Save the HTML from the code generator
		App.SelectedPage.set('pageHTML', App.CodeGen.get('deptHTML') );

		// Get the current date in string form
		var dateTxt = moment().format('MMMM Do YYYY, h:mm:ss a');
		
		// set date and share link
		App.SelectedPage.set('pageSharedDate',  dateTxt );
		App.SelectedPage.set('pageShareLink',   shareLink + App.SelectedPage.get('id') );
		
		// Save page
		App.SelectedPage.get('content').save();

}



////////////////////////////////////////////////////////////
//  EMBER HELPERS
////////////////////////////////////////////////////////////
Ember.Handlebars.helper('gridBlock', function(b, parentPageId, options) {



	// If the block doesn't exist on the DOM, add it
	if(! document.getElementById( b.get('id') ) ){
	  drawNewBlockFromEmberHelper( b, parentPageId);
	}

	// Return nothing because gridster will add it later
	return new Ember.Handlebars.SafeString("");
}, 'dCol', 'dRow', 'dSizeX', 'dSizeY', 'mCol', 'mRow', 'mSizeX', 'mSizeY', 'image');

Ember.Handlebars.helper('safeCode', function(b) {
	return new Ember.Handlebars.SafeString(b);
});


Ember.Handlebars.helper('gridBuilder', function(blocks, parentPageId, options) {

	blocks = App.SelectedPage.get('blocks').toArray().sort(smartSortBlocks);

	for (var i = 0; i < blocks.length; ++i){
	
		// If the block doesn't exist on the DOM, add it
		if(! document.getElementById( blocks.objectAt(i).get('id') ) ){

		  drawNewBlockFromEmberHelper( blocks.objectAt(i), parentPageId);
		}
	}
	dev = blocks;

	// Return nothing because gridster will add it later
	return new Ember.Handlebars.SafeString("");
}, 'dCol', 'dRow', 'dSizeX', 'dSizeY', 'mCol', 'mRow', 'mSizeX', 'mSizeY', 'image');

Ember.Handlebars.helper('safeCode', function(b) {
	return new Ember.Handlebars.SafeString(b);
});

Ember.Handlebars.helper('iframe', function(url) {
	// Delay so we can wait for the blocks to load
	setTimeout(function(){
		//console.log( "********* asdf *****", $('#live-preview-iframe') );
		$('#live-preview-iframe').attr("src", shareLink + App.SelectedPage.get('id') );
	}, 1000);
	return new Ember.Handlebars.SafeString('<iframe id="live-preview-iframe" src=""></iframe>');
});



////////////////////////////////////////////////////////////
//  FUNCTIONS
////////////////////////////////////////////////////////////

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

// Generates preview code for in the gridster app
function generatePreviewCodeForBlock(block){
	var res = "";

	// It's raw html
	if ( block.get('isRawHTML') ){
		res = '<li id="' + block.get('id') + '" block-id="' + block.get('id') + '"><pre><code class="html">\n';
		res += escapeHTML(block.get('html'));
		res += "</pre></code></li>\n";

	// Not a module, and has an image
	}else if ( block.get('image') ) {
		res ='<li id="' + block.get('id') + '" block-id="' + block.get('id') + '" class="' + block.get('gridBoxClasses') +
		'" ><img block-id="' + block.get('id') + '" id="'+ block.get('image') + '" src="" /><span class="html box-content ' + block.get('gridContentClasses') + '">' +
		block.get('html') + '</span><div class="draw-div"><div class="draw-text"></div></div></li>';

	// Not a module, no image
	}else{
		res = '<li id="' +  block.get('id') + '" block-id="' +  block.get('id') + '" class="' + block.get('gridBoxClasses') +
		'" ><span class="html box-content ' + block.get('gridContentClasses') + '">' + block.get('html') + 
		'</span><div class="draw-div"><div class="draw-text"></div></div></li>';

	}

	return res;
}

function escapeHTML(escapedHTML) {
	return escapedHTML.split('<').join('&lt;').split('>').join('&gt;')
}

function updateBlocksLiveCode(){
	var blocks = $('.gs-w');
	for (var i = 0; i < blocks.length; ++i){
		App.Store.find('block');
	}
}

function setModalPanel(transition){
	setTimeout(function() {
		
			$('.modal-bg').addClass('show-modal');
			$('.modal-wrapper').addClass('show-modal');

			$( ".modal-bg" ).unbind('click');

			$( ".modal-bg" ).click( function(e){
				$('.modal-bg').removeClass('show-modal');
				$('.modal-wrapper').removeClass('show-modal');
				setTimeout(function() {
					Router.transitionTo(transition);
				}, 400);
			});

		}, 200);
}

function getHTMLByBlock(pageId){
	var res = '';
	var styles = '';

	// Get the page
	App.Store.find('page', pageId).then( function(page) {

		// Get the blocks for this page and sort them
		blocks = App.SelectedPage.get('blocks').toArray().sort(smartSortBlocks);

		// Get page css if there is some
		if (page.get('pageCSS')){
			styles += '<style>\n' + page.get('pageCSS') + '\n</style>\n\n';
		}

		// Get the code for each block
		for (var i = 0; i < blocks.length; ++i){
			res += blocks[i].get('getBlockCode') + '\n';
		}

		// Set the preview code, which contains the styles and the html without the grid-wrapper divs
		App.CodeGen.set('previewCode', styles + res);

		// Add the grid wrapper divs to the html and save for the landing page
		var landingWrappers =	'<div class="creative-slot grid-wrapper grid-wrapper-1024" >' + 
							'<div class="grid-content" >\n\n';

		App.CodeGen.set('landingHTML', landingWrappers + res + '\n\n</div></div><!-- Grid Wrapper / Grid Content -->');

		// Get any images
		setTimeout(function(){
			for (var i = 0; i < blocks.length; ++i){
				//res += blocks[i].get('getBlockCode') + '\n';
				if (blocks[i].get('image')){
					App.Store.find('image', blocks[i].get('image')).then( function(imgObj) {
							// Set the image in the DOM
							var setImage = $('#live-preview-wrapper #' + imgObj.get('id'))[0];
							if (setImage){
								setImage.src = imgObj.get('imgData');
							}
							
					});
				}
			}
		}, 100);
	});
}


/* 


<div class="creative-slot grid-wrapper grid-wrapper-848"


data-file-name="fiesta-dp-seotagcloud-20141028.html"
data-developer="Aaron K"
data-designer="Sam N"
data-production-specialist="Sarah H"
data-code-date="2014/10/16"
data-design-date="2014/0/0"
data-production-date="2014/0/0"

>

<div class="grid-content pickles" style="color:blue;">

	<div class="grid-seo grid-font-left">

	    <h6 class="grid-seo--heading gotham14 gotham-bold grid-font-black" style="font-size:2em">Fiesta</h6>

	    <p class="grid-seo--paragraph gotham14 gotham-normal grid-font-black grid-line-height150">Kn&nbsp;ow’n for bold color and resilience, Fiesta dinnerware lets you set a brilliant table in any color you want. With an open stock model, you can pick and choose the pieces you need including dinner <a class="grid-font-black gotham-normal grid-seo--link" href="http://www.kohls.com/catalog/fiesta-bowls-dinnerware-serveware-kitchen-dining.jsp?CN=4294874671+4294719795+4294719798+4294719799">bowls</a>, dishes and classic <a class="grid-font-black gotham-normal grid-seo--link" href="http://www.kohls.com/catalog/fiesta-mugs-drinkware-glassware-kitchen-dining.jsp?CN=4294874671+4294719794+4294719611+4294719799">Fiesta mugs</a>. Plus, you can create a collection of Fiesta flatware, bedding or <a class="grid-font-black gotham-normal grid-seo--link" href="http://www.kohls.com/catalog/fiesta-table-cloths-table-linens-kitchen-dining.jsp?CN=4294874671+4294719732+4294719733+4294719799">tablecloths</a>.</p>

    	<p class="grid-seo--paragraph gotham14 gotham-normal grid-font-black grid-line-height150">Created in an art deco style, Fiesta dishes have embodied clean lines and utilitarian beauty since 1936. Update your grandmother's table with new colors and durable, modern materials. Choose from new colors looks — 2011 –  Poppy - , Lapis and Paprika and create new Fies&nbsp;ta famil'y heirloom’s.</p>

	</div>

</div> <!-- .grid-content -->
</div>

*/


// Generates code for Dept pages
function generateHTMLByModule(){

	var res = [];
	var resCount = 0;
	var strRes = "";

	var styles = '';
	var pageCSS = "";

	var blockGroups = [];
	var equityCount = 0;

	var wrapperHeader = "";
	var filename = App.SelectedPage.get('fileName');

	// If filename is null, make it a blank string
	if (filename == null || filename == "null"){
		filename = "";
	}

	// Get the blocks for this page and sort them
	blocks = App.SelectedPage.get('blocks').toArray().sort(smartSortBlocks);

	// Get page css if there is some
	if (App.SelectedPage.get('pageCSS')){
		pageCSS = '<style class="js-your-css js-css-always-enabled" data-file-name="' + filename.replace('*', 'banner') + '">\n' + App.SelectedPage.get('pageCSS') + '\n</style>\n\n';
	}

	// Separate the blocks by equity start and end
	for (var i = 0; i < blocks.length; ++i){ 

		// If this is null because it hasn't been touched yet
		if (!blockGroups[equityCount]) {
			// Make it an array
			blockGroups[equityCount] = [];
		}

		// Push the block onto the array
		blockGroups[equityCount].push( blocks[i] );

		// Increment if we reached an end point
		if ( (blocks[i].get('moduleName') && blocks[i].get('moduleName').toLowerCase() == "equity end") || 
			(blocks[i].get('moduleName') && blocks[i].get('moduleName').toLowerCase() == "seo" ) ){
			equityCount++;
		}
	}

	wrapperHeader = '<div class="creative-slot grid-wrapper" ' +
	'data-file-name="__FILENAME__" ' +
	'data-developer="' + App.SelectedPage.get('developer') + '" ' +
	'data-designer="' + App.SelectedPage.get('designer') + '" ' +
	'data-production-specialist="' + App.SelectedPage.get('prodSpecialist') + '" ' +
	'data-code-date="' + "code date" + '" ' +
	'data-design-date="' + "design date" + '" ' +
	'data-production-date="' + App.SelectedPage.get('liveDate') + '"> <div class="grid-content"> \n\n';
	
	// Set res[0] = pageCSS
	res[resCount] = pageCSS;
	++resCount;

	// Go through each block group
	for (var i = 0; i < blockGroups.length; ++i){

		// And then through each group
		for (var k = 0; k < blockGroups[i].length; ++k){

			// If we haven't accessed it yet, make it a string
			if (!res[resCount]){
				if (resCount == 1){
					res[resCount] = wrapperHeader.replace('__FILENAME__', filename.replace('*', 'feature') );
				}else{
					
					if (blockGroups[i][k].get('moduleName') == "SEO"){
						res[resCount] = wrapperHeader.replace('__FILENAME__', filename.replace('*', 'seotagcloud') );
					}else{
						res[resCount] = wrapperHeader.replace('__FILENAME__', filename.replace('*', 'equity' +  (resCount-1)) );
					}
					
				}
				
			}

			// Add to this response string
			res[resCount] += blockGroups[i][k].get('getBlockCode');
		}

		res[resCount] += '\n\n</div></div>\n\n';
		
		// Increment response counter
		++resCount;

	}

	for (var i = 0; i < res.length; ++i){
		strRes += res[i];
	}

	// Save as dept code
	App.CodeGen.set('deptHTML', strRes );
	
}  // Generate HTML by module


function resetTabBarEvents (){
	$('#open-pages-tabs a').unbind( "dblclick" );
	$('#open-pages-tabs a').dblclick(function(e){
			if (confirm("Are you sure you want to close this page?")) {
			   console.log('CLOSING', e.currentTarget.href.split('/')[6]);
				App.Store.find('page', e.currentTarget.href.split('/')[6]).then(function(page) {
					App.OpenPages.removeObject(page);
				});
			   
			   Router.transitionTo('pages');
			}
	});
}

function updateRecentPages(pageId){
	var recent =  localStorage.getItem( 'recentpages' );
	// If the recent has items in it
	if (recent && recent != null && recent != "null"){
		// parse it
		recent = JSON.parse( recent );
		// If it isn't in there yet, push it
		if (recent.indexOf(pageId) > -1 ){
			recent.removeObject(pageId);
		}

	// If it's empty
	}else{
		recent = [];
	}

	recent.pushObject(pageId);
	localStorage.setItem( 'recentpages', JSON.stringify( recent ) );

	App.Store.find('page', pageId).then( function(page) {
			App.RecentPages.removeObject(page);
			// App.RecentPages.pushObject(page);
		});

	loadRecentPages();

}

function loadRecentPages(){
	App.RecentPages.clear();
	var recent =  localStorage.getItem( 'recentpages' );
	// If there are recent pages, load them 
	if (recent && recent != "null" && recent != null){
		recent = JSON.parse( recent );
		
		for(var i = (recent.length-1); i >= 0; --i){
			
			App.Store.find('page', recent[i]).then( function(page) {
				App.RecentPages.pushObject(page);
			});
		}

	}
}


// Load recent pages
setTimeout(function() {
		loadRecentPages();
}, 500);



})(window);


function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}



/*

Node Server Commands:

List all running processrs:
ps -ef

Move files over network:
scp /Users/tkb5825/node/app.js root@10.3.40.225:/root/nodeapp/app.js
scp /Users/tkb5825/node/package.json root@10.3.40.225:/root/nodeapp/package.json

Set Proxy:
export http_proxy=http://tkb5825:sch18108@proxy.kohls.com:3128
export https_proxy=http://tkb5825:sch18108@proxy.kohls.com:3128


Notes:
curl -O http://nodejs.org/dist/node-latest.tar.gz | tar xz --strip-components=1
export PATH=/mongodb/mongodb-linux-x86_64-2.6.3/bin:$PATH
export PATH=/root/mongodb/bin:$PATH



****** Run Mongo ******
- Connect to the server using
ssh root@10.3.40.227
and the password "kohls123"

- Move to the folder "/mongodb/bin"

- Then start mongo and fork the process so it
stays open when you close the terminal window:
./mongod --fork --logpath /var/log/mongod.log



****** Run Node App ******
- Connect to the server using
ssh root@10.3.40.225
and the password "kohls123"

- Move to the folder "/root/nodeapp"

- Run Node app using the Forever framework:
forever start app.js -w





*/









