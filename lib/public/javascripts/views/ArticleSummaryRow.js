views.ArticleSummaryRow = Backbone.View.extend({

	tagName: 'div',

	className: 'article-detail-row-wrapper',

	events: {
		'click .destroy': 'removeRow'
	},

	initialize: function(){
		this.listenTo(this.model, 'change:destroy', this.destroy);
		this.listenTo(this.model, 'redrawMarker', this.redrawMarker);

		// For tooltip labels
		this.units = {
			twitter: 'Shares',
			facebook: 'Likes',
			pageviews: 'On page',
			avg_time_on_page: 'Seconds',
			per_external: 'Referrals'
		}
	},

	render: function() {
		var $el = this.$el,
				model_json = this.model.toJSON(),
				article_detail_markup = templates.articleSummaryRowFactory( _.extend(model_json, helpers.templates) ),
				subject_tag_len,
				impact_tag_len;

		// Store how we're calculating the marker 
		this.calcComparisonMarkerParams();

		this.$el.html(article_detail_markup);
		this.$el.attr('data-title', model_json.title)
						.attr('data-timestamp', model_json.timestamp);

		// TODO, This data transformation might be cleanera as a method on the article summary model
		// Since that's how we're doing it now forextrating timeseries data
		this.data = this.transformData(this.model.toJSON());

		// Add a whole bunch of quant attributes dynamically
		_.each(this.data.quant_metrics, function(bullet){
			$el.attr('data-'+bullet.metric, bullet.value);
		});

		// Add aggregate values for bars
		if (this.data.subject_tags) { 
			subject_tag_len = this.data.subject_tags.length;
		} else {
			subject_tag_len = 0;
		}

		$el.attr('data-subject-tags', subject_tag_len);

		if (this.data.impact_tags) { 
			impact_tag_len = this.data.impact_tags.length;
		} else {
			impact_tag_len = 0;
		}

		$el.attr('data-impact-tags', impact_tag_len);

		this._el = d3.select( this.el ).select('.article-detail-row-container').selectAll('.cell');

		this.enter();
		return this;
	},

	calcComparisonMarkerParams: function(){
		this.comparison_marker_dimension = collections.article_comparisons.instance.metadata('comparison-marker-dimension');
		this.comparison_marker_group     = collections.article_comparisons.instance.metadata('comparison-marker-group');
		this.comparison_marker_max       = collections.article_comparisons.instance.metadata('comparison-marker-max');
		return this;
	},

	redrawMarker: function(){
		this.calcComparisonMarkerParams();

		var that = this;
		var markers = this.bullet_markers
				.transition()
				.duration(450)
				.ease('exp-out')
				.styleTween('left', function(d) { 
					// This is madness, but d3 requires us to venture to such depths
					// D3 won't interpolate a starting value in the way you think
					// So if you want to interpolate from left 23% to left 26%
					// It will interpolate from the pixel representation of 23% to 20%
					// So that will go from 10px to 20%, the 10px acts like a percent
					// So we reverse engineer the percent from the pixel value wrt to its parent container
					// And set that as the starting percentage
					// Some reference https://github.com/mbostock/d3/issues/1070
					var starting_px = parseFloat(d3.select(this).style('left')),
							parent_px = this.parentNode.offsetWidth,
							starting_percent = starting_px/parent_px * 100,
							ending_percent = that.helpers.calcSize.call(that, d.metric, that.comparison_marker_dimension, that.comparison_marker_max),
							ending_pixel = parseFloat(ending_percent)* parent_px;

					return d3.interpolate(starting_percent, ending_percent); 
				});

	},

	transformData: function(modelData){
		// For subject tags, chunk them into groups of three so they will be displayed as columns of no more than three. Each one looks like this and they're stored under `subject_tags_full`.
		/*
    {
      "articles": 2,
      "domain": "propalpatine.org",
      "name": "Fracking",
      "color": "#6a3d9a",
      "id": 5,
      "events": 2
    }
		*/
		// `tag_columns` will be a list of lists, each containing no more than three tags
		var subject_tag_columns = [],
				chunk = 3;

		if (modelData.subject_tags_full){
			for (var i = 0; i < modelData.subject_tags_full.length; i += chunk) {
				subject_tag_columns.push( modelData.subject_tags_full.slice(i,i+chunk) );
			}
			modelData.subject_tags_grouped = subject_tag_columns;

		}

		if (modelData.impact_tags_full){

			// Impact tags need more nesting. It makes most sense to group them by category
			// These tags look like this and they're found under `impact_tags_full`.
			/*
			{
	      "category": "change",
	      "articles": 2,
	      "domain": "propalpatine.org",
	      "name": "legislative impact",
	      "level": "Institution",
	      "color": "#fb8072",
	      "events": 2, 
	      "id": 1
	    }
			*/
			modelData.impact_tags_grouped = d3.nest()
				.key(function(d) { return d.category; })
	 			.entries(modelData.impact_tags_full);
		}

		// // Next by tag category
		// modelData.qual_metrics['impact_tags'] = d3.nest()
		// 	.key(function(d) { return d.category } )
		// 	.rollup(function(list){
		// 		return {
		// 			count: list.length,
		// 			values: list
		// 		}
		// 	})
		// 	.entries(modelData.qual_metrics['impact_tags'])

		// TEMPORARY, remove total_time_on_page, internal and external
		var column_order = ['twitter', 'facebook', 'pageviews', 'avg_time_on_page', 'per_external'];

		modelData.quant_metrics = modelData.quant_metrics.filter(function(qMetric){
			return column_order.indexOf(qMetric.metric) != -1;
		});
		// Sort the quant data so it plots the right values for how we set up the grid
		modelData.quant_metrics.sort(function(a,b){
			return column_order.indexOf(a.metric) - column_order.indexOf(b.metric);
		});

		// TEMPORARY, Should probably be done on the server.
		// Fill in any missing values with some calculating values
		var missing_metrics,
				existing_metrics;
		if (modelData.quant_metrics.length != column_order.length){
			existing_metrics = _.pluck(modelData.quant_metrics, 'metric');
			missing_metrics = _.difference(column_order, existing_metrics).map(function(metric){
				return {
					metric: metric,
					value: 'In progress...'
				}
			});
			modelData.quant_metrics = missing_metrics;
		}

		return modelData;
	},

	enter: function(cb){
		var that = this;
		var row = this._el.data([this.data]).enter(); // This should work with `datum` and not have to wrap in an array, but that is giving an undefined enter selection.
		// Add the first two cells
		// Title
		row.append('div')
				.classed('cell', true)
				.classed('title', true)
				.classed('go-to-detail', true)
				.classed('wide', true)
				.classed('tooltipped', true)
				.attr('data-tooltip-align', 'left')
				.attr('data-id', function(d) { return d.id })
				.attr('aria-label', function(d) { 
					var unicode_title = helpers.templates.htmlDecode(d.title);
					return unicode_title;
				})
				.append('div')
					.classed('title-text', true)
					.html(function(d) { 
						return d.title;
					});
					// .html(function(d) { return d.id });

		// And date
		row.append('div')
				.classed('cell', true)
				.classed('date', true)
				.classed('single', true)
				.attr('data-timestamp', function(d) { return d.timestamp } )
				.html(function(d) { return helpers.templates.conciseDate(d.timestamp) });

		// Make a container for the bullet
		var bullet_container = this._el.data(this.data.quant_metrics);
		var _bullet_container = bullet_container.enter()
				.append('div')
					.classed('cell', true)
					.classed('gfx', true)
					.classed('tooltipped', true)
					.attr('aria-label', function(d){
						var metric = d.metric,
								unit = that.units[d.metric],
								value = d.value;

						// Do some metric-specific formatting
						// Cut off the digits so it's not too long
						if (metric == 'avg_time_on_page' && value > 0) { 
							value = value.toFixed(2);
						};
						// Make a readable percent
						if (metric == 'per_external' && value > 0){
							value = Math.round(value*100) + '%';
						}

						return unit + ': ' + helpers.templates.addCommas(value);
					})
					.append('div')
						.classed('bullet-container', true);

		// Do the bullet
		var that = this;
		_bullet_container.append('div')
					.classed('bullet', true)
					.style('width', function(d) { 
						var comparison_max = that.comparison_marker_max;
						// If we're comparing external, don't do the percentile max. Set it to the absolute max, which will be 1 at the most
						if (d.metric == 'per_external') {
							comparison_max = 'max';
						}

						// TEMPORARY
						var width;
						if (d.value != 'In progress...'){
							width = that.helpers.calcSize.call(that, d.metric, d.value, comparison_max);
						} else {
							width = 0;
						}
						return width;
					});

		// And the marker
		var bullet_markers = _bullet_container.append('div')
					.classed('marker', true)
					.style('left', function(d) { 
						var comparison_max = that.comparison_marker_max;
						// If we're comparing external, don't do the percentile max. Set it to the absolute max, which will be 1 at the most
						if (d.metric == 'per_external') {
							comparison_max = 'max';
						}
						var left_offset
						if (d.value != 'In progress...'){
							left_offset = that.helpers.calcSize.call(that, d.metric, that.comparison_marker_dimension, comparison_max);
						} else {
							left_offset = '-9%';
						}
						return left_offset
					});

		// Make a container for subject bar tags
		var subject_bar_container = row.append('div')
			.classed('cell', true)
			.classed('bars', true)
			.classed('gfx', true)
			.append('div')
				.classed('bar-container', true)
				.attr('data-group', 'subject-tags');

		// Only do this if articles have subject tags
		if (this.data.subject_tags_grouped) {
			subject_bar_container.selectAll('.bar-column').data(this.data.subject_tags_grouped).enter()
				.append('div')
				.classed('bar-column', true)
				.selectAll('.bar').data(function(d) { return d; }).enter()
					.append('div')
						.classed('bar', true)
						.style('background-color', function(d) { return d.color; })
						.classed('tooltipped', true)
						.attr('aria-label', function(d){
							return d.name;
						});

		}


		// Make a container for impact bar tags 
		var impact_bar_container = row.append('div')
			.classed('cell', true)
			.classed('bars', true)
			.classed('gfx', true)
			.append('div')
				.classed('bar-container', true)
				.attr('data-group', 'impact-tags');

		if (this.data.impact_tags_grouped) {
			var impact_bar_column = impact_bar_container.selectAll('.bar-column').data(this.data.impact_tags_grouped).enter()
				.append('div')
					.classed('bar-column', true)

			impact_bar_column.selectAll('.bar').data(function(d) { return d.values }).enter()
				.append('div')
					.classed('bar', true)
					.style('background-color', function(d) { return d.color })
						.classed('tooltipped', true)
						.attr('data-tooltip-align', 'right')
						.attr('aria-label', function(d){
							return d.name + ': ' + helpers.templates.toTitleCase(d.level) + ' ' + d.category;
						});
		}


		this.bullet_markers = bullet_markers;

		return this;

	},

	removeRow: function(){
		collections.article_comparisons.instance.remove(this.model);
		app.instance.saveHash();
		return this;
	},

	destroy: function(model, destroyMode){
		if (destroyMode == 'delete') {
			if (app.instance.$isotopeCntnr) { 
				app.instance.$isotopeCntnr.isotope( 'remove', this.$el ).isotope('layout'); 
			} else { 
				// this.killView();
				// this.remove(); 
			}
			this.killView();
			// Reset the destroy mode so we might add it and destroy it again
			model.set({'destroy': false}, {silent: true});
		}
		return this;
	},

	helpers: {
		calcSize: function(metric, val, field, group){
			/** Metric options: per97_5, per75, median, per25, per2_5, per5, per95, mean **/
			field = field || this.comparison_marker_max;
			group = group || this.comparison_marker_group;

			var this_metrics_info = _.findWhere(pageData.articleComparisons[group], {metric: metric}),
					max,
					scale,
					val_percent;
			try {
				max = this_metrics_info[field];
				scale = d3.scale.linear()
										.domain([0, max])
										.range([0, 100]);

				if (typeof val == 'string') {
					val = this_metrics_info[val];
				}

				val_percent = Math.round(scale(val)).toString() + '%';
				
			} catch (err) {
				console.log('ERROR: Missing comparison values for group', group, 'and metric', metric);
				val_percent = '0%';
			}
			return val_percent;
		}
	}

});
