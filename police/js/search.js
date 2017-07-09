'use strict';
Core.on('init', function(initArgs) {
    var sectors,
        areas,
        regions,
        streets,
        departments,
        persons,
        city,
        templates = initArgs.templates,
        location = initArgs.location;

    Core.on('load', function(args) {
        sectors = args.sectors;
        areas = args.areas;
        regions = args.regions;
        streets = args.streets;
        departments = args.departments;
        persons = args.persons;
        templates = args.persons;
        city = args.city;
    })

    var $txtSearch = $('#txt-search')
        .on('focus', function() { this.select() })
        .on('change', function(e, args) {
            if (args) {
                markCurrent()
                var $row = args.$row,
                    dsind = Number($row.attr('data-dsindex')),
                    ds = args.data.filter(function(d) {
                        return d.dsindex == dsind
                    })[0],
                    ind = $row.index(),
                    o = ds.data[ind].item;
                if (dsind == 0) { //yandex addr
                    map.setCenter(o.coords)
                    markCurrent(o.name, o.coords)
                } else if (dsind == 2) { //sector streets
                    o.sector.select(true)
                    API.resolveAddr(city, o.name, function(data) {
                        var d = data[0];
                        if (d) markCurrent(d.name, d.coords)
                    })
                } else if (dsind == 1) { //region
                    o.select(true)
                } else if (dsind == 3) { //sector
                    o.select(true)
                } else if (dsind == 4) { //person
                    o.location.select(true)
                } else if (dsind == 5) { //person
                    o.select(true)
                }
            }
        })

    function markCurrent(addr) {
        Core.trigger('map-click.resolved', { addr: addr });
    }

    function parseQuery(q) {
        var pq = q.toLowerCase().split(/[\s,]+/);
        var numbers = pq.map(function(s) {
                return parseInt(s)
            }) //.filter(function(s) { return !!s})
        pq.forEach(function(p, i) {
                if (numbers[i]) pq[i] = (numbers[i]);
            })
            //return pq.concat(numbers)
        return pq;
    }
    $('#btn-locate').on('click', function() {
        location(function(p) {
            searchPoint(p)
            resolvePoint(p)
        })
    })
    Core.on('map.click', function(args) {
        resolvePoint(args.coords)
    })

    function searchPoint(pos) {
        console.log('searchPoint', pos)
        if (!map) return;
        for (var i = 0; i < regions.length; i++) {
            var r = regions[i];
            if (r.pol && r.pol.geometry.contains(pos)) {
                r.render()
                return;
            }
        }
    }

    function resolvePoint(p) {
        markCurrent()
        API.resolvePoint(city, p, function(addr) {
            if (!addr[0]) return;
            var name = addr[0].name;
            //if (cp) cp.properties.set('iconCaption', name).set('hintContent', name);
            var pq = parseQuery(name);
            markCurrent(name);
            var strres = search(streets, pq, function(o) {
                    if (o) return o.name
                })
                // console.log(addr[0].name, strres[0])
            if (strres[0]) {
                var sec = strres[0].item.sector;
                sec.select(false, true)
            }
        })
    }

    function search(arr, ws, fname) {
        var res = []
        arr.forEach(function(o) {
            var matches = [],
                rate = 0;
            var s = fname(o);
            if (!s) return;
            var slc = s.toLowerCase();
            ws.forEach(function(w) {
                var ind = slc.indexOf(w);
                if (ind >= 0) matches.push({ w: w, ind: ind })
                if (ind == 0) rate++;
            })
            if (matches.length > 0) {
                rate += matches.length;
                res.push({ name: s, matches: matches, rate: rate, item: o })
            }
        })
        res.sort(function(a, b) {
                return b.rate - a.rate
            })
            //console.warn(res);
        return res.slice(0, 5);
    }

    $txtSearch.autocomplete($('#search-popup'), templates.autocomplete, function(q, success) {
        if (!q) return;
        var pq = parseQuery(q);
        var regres = search(regions, pq, function(o) {
            return o.region.name
        })
        var depres = search(departments, pq, function(o) {
            return o.department.name
        })
        var secres = search(sectors, pq, function(o) {
            return o.sector.name
        })
        var strres = search(streets, pq, function(o) {
            if (o) return o.name
        })
        var perres = search(persons, pq, function(o) {
            if (o) return o.name
        })
        var yres = []
        var res = [
            //{ title: 'Карта', type: 'map', dsindex: 0, data: yres },
            { title: 'Отделения', type: 'regions', dsindex: 1, data: regres },
            { title: 'Адрес', type: 'addrs', dsindex: 2, data: strres },
            { title: 'Участковые', type: 'sectors', dsindex: 3, data: secres },
            { title: 'Начальники', type: 'persons', dsindex: 4, data: perres },
            { title: 'ОУМВД', type: 'departments', dsindex: 5, data: depres },
        ]
        success(res)
            //console.log(res)
        return API.resolveAddr(city, q, function(data) {
            data.forEach(function(d) { yres.push({ name: d.name, item: d }) })
            success(res)
        })
    })
})
