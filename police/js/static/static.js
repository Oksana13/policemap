$(function() {
	var $all = $('#all-list').find('.item');
	var oldQ;
	$('#txt-search').on('change keyup', function(e) {
		var q = $(this).val().trim().toLowerCase();
		$(this).val(q);
		if (!q || oldQ == q) {
			oldQ = null;
			$all.show();
			return;
		}
		if (e.keyCode == 13) {
			search()
		} else {
			oldQ = q;
			$all.hide();
			var $filtered = $all.filter(function() {
				var title = $(this).find('.title').text().trim().toLowerCase();
				return (title.indexOf(q) >=0);
			}).show();
		}

	})
	function search() {
		var cityInd = $('#city-ind').val();
		var q = $('#txt-search').val();
		console.log('search', q, cityInd)
		if (!q) return;
		location.href = '#city=' + cityInd + '&query=' + q;
	}
	console.log($('#btn-search'))
	$('#btn-search').on('click', search)

	var map = createStatic();
})