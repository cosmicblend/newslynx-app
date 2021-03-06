views.EventEditor = views.AA_BaseForm.extend({

	events: _.extend({
		'change input': 'printData',
		'submit form': 'createEvent'
	}, views.AA_BaseForm.prototype.events),

	initialize: function(options){
		this.model = options.model;
		// Add the passed in options
		// _.extend(this, _.pick(options, 'assignee'));
		// First perform a deep copy of our existing `pageData.eventCreatorSchema` so we don't mess anything up
		// Save a fresh copy under `schema`
		var event_creator_schema = $.extend(true, {}, pageData.eventCreatorSchema);

		// Don't allow for a change in assignment
		// TODO, maybe we do allow this later but for now it's complicated
		delete event_creator_schema.assignees;

		// Add default values to the schema under the `selected` property, in this case assignee
		event_creator_schema = this.combineFormSchemaWithVals(event_creator_schema, options.defaults);

		// Store this on the schema with this article's information on the view
		// We will re-render the view on form submit, rendering makes a copy of these initial settings
		this.event_schema = event_creator_schema;

		// Prep the area by creating the modal markup
		this.bakeModal('Edit this event');

		// Bake the modal container and form elements
		this.render();
		// Init the title searcher and pikaday, pass in true for either to disable in that order
		this.postRender(true);
		this.dehydrateImpactTags();
	},

	render: function(){
		var markup = '',
				event_schema = $.extend(true, {}, this.event_schema);

		// Bake the initial form data
		_.each(event_schema, function(fieldData, fieldName){
			markup += this.bakeFormInputRow.call(this, fieldName, fieldData);
		}, this);

		markup += this.bakeButtons(true);

		this.$form.html(markup);

		var defaults = {
			timestamp: event_schema.timestamp.selected,
			link: event_schema.link.selected,
			title: event_schema.title.selected,
			description: event_schema.description.selected,
			impact_tags: event_schema.impact_tags.selected
		};

		// In case there are no defaults for tags, which would be crazy
		this.event_data = _.extend({
			impact_tags: [],
			assignees: []
		}, defaults);

		return this;
	},

	formListToObject: function(){
		var form_data = this.event_creator_options;
		var form_obj = {
			impact_tags: [],
			assignees: []
		};
		form_data.forEach(function(formItem){
			var name = formItem.name,
					form_value = formItem.selected;
			if (name != 'impact_tags' && name != 'assignees'){
				form_obj[name] = form_value;
			} else {
				form_obj[name].push(form_value);
			}
		});
		return form_obj;
	},

	createEvent: function(e){
		e.preventDefault();
		
		var settings_obj = this.event_data;

		delete settings_obj.assignees;

		var required_keys = [
			'timestamp',
			'title',
			'impact_tags'
			];

		this.validate(required_keys, function(error, description){
			var that = this;
			if (!error){
				that.model.save(settings_obj, {
					// patch: true,
					error: function(model, response, options){
						console.log('error in event edit', response);
						that.printMsgOnSubmit(true, 'Could not save to the server. Send me an email with a description of what you were doing and I\'ll look into it: <a href="mailto:meow@newslynx.org">meow@newslynx.org</a> &mdash; <em>Merlynne</em>.');

					},
					success: function(model, response, options){
						console.log('event edited', response);
						that.printMsgOnSubmit(false, '');
						views.helpers.toggleModal(e);
						that.model.trigger('rerender');
						// TODO, update view
					}
				});
			
			} else {
				this.printMsgOnSubmit(error, description);
			}

		});

	},

	// The tags shouldn't be objects, they should just be id numbers
	dehydrateImpactTags: function(){
		this.event_data.impact_tags = _.pluck(this.event_data.impact_tags, 'id');
	}

});