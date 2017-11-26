'use strict';
$(function() {
  Core.on('init', function(initArgs) {
    var regions, sectors, map, areas;
    var templates = initArgs.templates;
    Core.on('load', function(args) {
      areas = args.areas;
      sectors = args.sectors;
      map = args.map;
    })
    var $details = $('#details'),
      $ddetails = $('#department-details'),
      $rdetails = $('#region-details'),
      $sdetails = $('#sector-details');

    if (location.href.indexOf('admin') > 0) {
      var isAdmin = true;
      $('[local-url]').each(function() {
        this.href = '../' + $(this).attr('href')
      })
    }



    $('#main-menu').find('[data-link]').on('click', function() {
      var link = $(this).attr('data-link');
      if (isAdmin) link = '../' + link;
      $('#info-holder-iframe').attr('src', link)
      $('#info-holder').addClass('expanded')
    })
  })
})