views.AA_BaseSettingListItemRecipe = views.AA_BaseSetting.extend({

	tagName: 'li',

	render: function(){
		var template = this.options.template || this.template;
		var parent_el = this.options.parentEl || this.parentEl;

		if (template){
			this.$el.html(template( {} ));
			if (parent_el){
				$(parent_el).append(this.el);
			}
		}

		return this;

	}, 
	
	checkIfNew: function(){
		if (!this.model){
			this.model = new models.recipe.Model(this.default_model_opts);
			collections.recipes.instance.add(this.model);
			this.$el.find('.js-parent-form').attr('data-new', 'true');
		}
		return this;
	},

	preSaveHook: function(){
		// Add the homepage if it wasn't already on there
		// This happens on first account creation when they set the homepage and then create recipes which have been scaffolded
		var options = this.model.get('options');
		if (!options.search_query){
			options.search_query = pageData.org.homepage;
			this.model.set('options', options);
		}
	}

});