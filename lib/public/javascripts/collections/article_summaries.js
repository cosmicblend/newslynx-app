collections.article_summaries = {
	"instance": null,
	"Collection": Backbone.Collection.extend({
		model: models.article_summary.Model,
		url: 'api/articles/summary'
	})
}