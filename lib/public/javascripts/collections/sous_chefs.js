collections.sous_chefs = {
	"instance": null,
	"schemas_instance": null,
	"Collection": Backbone.Collection.extend({
		url: '/api/_VERSION/sous-chefs',
		model: models.recipe.Model,
		setBoolByIds: helpers.modelsAndCollections.setBoolByIds
		// comparator: function(recipe){
		// 	return -recipe.id;
		// }
	})
}