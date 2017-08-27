'use strict'
var ObjectWrapper = (function() {
    var isAdmin = (location.href.indexOf('admin') > 0);
    var anfields, anvalues, map, markpoints = [], templates,
        regions, departments, meta;

    Core.on('init', function(initArgs) {
        templates = initArgs.templates;
    })
    Core.on('load', function(args) {
        anfields = args.anfields;
        anvalues = args.anvalues;
        map = args.map;
        regions = args.regions;
        departments = args.departments;
        meta = args.meta;
    })

    function pregion(r) {
        this.region = r;
    }

    function getRate(rate) {
        return (rate) ? { val: rate, formatted: Math.round(rate * 5), fixed: (rate * 5).toFixed(1) } : { val: 0, formatted: '', fixed: '' }
    }

    function calcRate(vals) {
        if (vals && vals.length > 0) {
            var notFull = false;
            var count = {},
                all = {},
                rates = {};
            anfields.fields.forEach(function(fi, i) {
                var w = fi.weight || 1,
                    cat = fi.category;
                if (fi.hidden) return;
                if (vals[i] == null) notFull = true;
                if (!count[cat]) count[cat] = 0;
                if (!all[cat]) all[cat] = 0;
                if (vals[i]) count[cat] += w;
                all[cat] += w;
            })
            var total = 0,
                totalCount = 0;
            for (var cat in count) {
                rates[cat] = getRate(count[cat] / all[cat]);
                totalCount += count[cat];
                total += all[cat];
            }
            return { totalRate: getRate(totalCount / total), rates: rates, notFull: notFull };
        }
    }

    function getRateColor(r) {
        var h, s = 1,
            l = 0.5;
        if (!r.rate) return '#fff'
        var tr = r.rate.val;
        h = (100 * tr) / 360;
        //console.log(tr, h , s ,l)
        var rgb = Common.hslToRgb(h, s, l);
        return 'rgb({0},{1}, {2})'.format(rgb[0], rgb[1], rgb[2]);
    }

    function getCenter(p) {
        if (!p) return;
        var pb = p.geometry.getPixelGeometry().getBounds();
        var pixelCenter = [pb[0][0] + (pb[1][0] - pb[0][0]) / 2, (pb[1][1] - pb[0][1]) / 2 + pb[0][1]];
        var geoCenter = map.options.get('projection').fromGlobalPixels(pixelCenter, map.getZoom());
        return geoCenter;
    }
    var rselected, dselected, sselected, hovered = {};
    
    function markPointOpacity(type, obj) {
        if (obj && obj.place)
            $('#point-icon-' + type + '-' + obj.number()).addClass('marked')
        var old = hovered[type];
        if (old && old.place && old != obj) {
            $('#point-icon-' + type + '-' + old.number()).removeClass('marked')
        }
        hovered[type] = obj;
    }

    function clearSelections() {
        if (dselected) dselected.markSelected(false)
        if (rselected) rselected.markSelected(false)
        if (sselected) sselected.markSelected(false)
    }

    var regIconTemplate = '';
    function constructPlace(obj, type, coords, content) {
        var icon = obj.icon;
        if (!icon) icon = 'sheriff.png'; 
        var iconUrl = 'css/img/icons/' + icon;
        var emptyUrl = 'css/img/empty.png';
        if (isAdmin) {
            iconUrl = '../' + iconUrl; 
            emptyUrl = '../' + emptyUrl; 
        }
        var regIcon = Mustache.render(templates.mapPoint, {icon : iconUrl, num : obj.number, type : type})
        var regLayout = ymaps.templateLayoutFactory.createClass(regIcon)
        var args = {
        build: function () {
            this.constructor.superclass.build.call(this);
            var $point = $('#point-icon-' + type + '-' + obj.number);
            $point.bind('click', function() {
                console.log(1)
            })
            console.log($point)
        }}
        var place = new ymaps.Placemark(coords, {
            balloonContentHeader: obj.name,
            balloonContentBody: obj.addr,
            balloonContentFooter: obj.tel,
            hintContent: obj.name,
            iconContent: content, //если есть "Кол-во задержанных", то выводить их
            overlayFactory: 'default#interactiveGraphics'
        }, {
            iconLayout: 'default#imageWithContent',
            iconImageHref: emptyUrl,
            iconImageSize: [40, 40],
            iconImageOffset: [-20, -20],
            iconContentOffset: [20, 20],
            hideIconOnBalloonOpen: false,
            iconContentLayout: regLayout
        });
        //console.log(obj, type, coords, content)
        return place;
    }
    Core.on('map.click', function() { clearSelections() })
    pregion.prototype = {
        hover: function(val) {
            if (rselected != this) {
                this.pol.options.set('fillOpacity', val ? 0.5 : 0.3);
                this.pol.options.set('zIndex', val ? 11 : 10);
            }
        },
        draw: function() {
            if (!map || !window.ymaps) return;
            var r = this;
            if (r.pol) map.geoObjects.remove(r.pol);
            var reg = r.region;
            if (!reg.coords || !reg.coords.length) return;
            var pol = new ymaps.Polygon([reg.coords, []], { hintContent: reg.name }, { zIndex: 10, fillOpacity: 0.3, fillColor: r.color });
            map.geoObjects.add(pol);
            pol.events.add('mouseenter', function(e) { r.hover(true) })
            pol.events.add('mouseleave', function(e) { r.hover(false) })
            pol.events.add('click', function(e) {
                Core.trigger('map.click', { coords: e.get('coords') })
                setTimeout(function() { r.select(); }, 1)
            })
            map.geoObjects.add(pol);
            r.pol = pol;
            r.clearStyle()
            if (reg.point) {
                if (r.place) {
                    map.geoObjects.remove(r.place);
                    markpoints.slice(markpoints.indexOf(r.place), 1)
                }
                var place = constructPlace(reg, 'region', reg.point.coords, reg.number);
                r.place = place;
                map.geoObjects.add(place);
                markpoints.push(place)
                place.events.add('click', function() { r.select(true); })
            }
        },
        clearStyle: function() {
            if (this.pol)
                this.pol.options.set('strokeWidth', 1).set('zIndex', 0).set('strokeColor', '#777');
        },
        calcRate: function() {
            var r = this;
            var num = r.region.number;
            var published = meta.data.published;
            if (published)
                r.anketaPublished = published[num]
            var res = calcRate(anvalues[num]);
            if (res) {
                if (!isAdmin && !r.anketaPublished) return;
                r.rate = res.totalRate;
                r.rates = res.rates;
                r.color = getRateColor(r)
                r.starRate = []
                for (var i = 0; i < 5; i++) {
                    r.starRate.push(i < r.rate.formatted);
                }
                r.notFullRate = res.notFull;
            }
        },
        select: function(focus, nostate) {
            var r = this;
            if (dselected) dselected.markSelected(false)
            if (rselected) rselected.markSelected(false)
            Core.trigger('region.select', { region: r })
            if (window.ymaps) {
                if (focus) {
                    if (r.place) {
                        r.place.balloon.open();
                    }
                    if (map && r.pol) {
                        map.setCenter(getCenter(r.pol))
                    }
                } else {
                    r.markPointOpacity(true)
                }
                rselected = r.markSelected(true);
            } else {
                if (this.region.point && this.region.point.coords && focus)
                    map.markPoint({ coords: this.region.point.coords, preset: 'pmlbm' })
            }
            if (!nostate) State.addState({ type: 'region', rowId: r.ind })
        },
        number: function() {
            return this.region.number
        },
        getRates: function() {
            var rates = this.rates,
                ratesArr = [];
            for (var cat in rates) {
                ratesArr.push({ category: cat, rate: rates[cat] })
            }
            return ratesArr;
        },
        markSelected: function(val) {
            this.markPointOpacity(val);
            if (this.place && !val) this.place.balloon.close();
            if (val && this.pol) {
                this.pol.options.set('strokeWidth', 4).set('zIndex', 11).set('strokeColor', '#444');
            } else {
                this.clearStyle()
            }
            return this
        },
        markPointOpacity: function(val) {
            if (window.ymaps) {
                markPointOpacity('region', val ? this : null)
            } else {
                if (this.region.point && this.region.point.coords)
                    map.delayMarkPoint({ coords: this.region.point.coords, preset: 'pmlbm' })
            }
        },
        markGroouped: function(val) {
            if (val && this.pol) {
                this.pol.options.set('strokeWidth', 4).set('zIndex', 11).set('strokeColor', '#444');
            } else {
                this.clearStyle()
            }
            return this
        },
        show: function(val) {
            if (this.pol) this.pol.options.set('visible', val)
        },
        render: function(ank) {
            Core.trigger('region.select', { region: this, ank: ank })
        }
    }

    function pdepartment(d) { this.department = d; }
    pdepartment.prototype = {
        draw: function() {
            if (!map || !window.ymaps) return;
            var d = this;
            var dep = this.department;
            if (d.place) map.geoObjects.remove(d.place);
            if (!dep.coords) return;
            var place = constructPlace(dep, 'department', dep.coords);
            d.place = place;
            map.geoObjects.add(place);
            place.events.add('click', function() { d.select(); console.log(1) })
        },
        select: function(focus, nostate) {
            var d = this;
            Core.trigger('department.select', { department: d })
            if (window.ymaps) {
                if (focus) {
                    if (map && d.place) map.setCenter(getCenter(d.place))
                    clearSelections()
                    if (d.place) d.place.balloon.open();
                }
                if (dselected) dselected.markSelected(false)
                dselected = d.markSelected(true);
            } else {
                if (this.department.coords && focus)
                    map.markPoint({ coords: this.department.coords, preset: 'pmblm' })
            }
            if (!nostate && focus) State.addState({ type: 'department', rowId: d.ind })
        },
        markPointOpacity: function(val) {
            if (window.ymaps) {
                markPointOpacity('department', val ? this : null)
            } else {
                if (this.department.coords)
                    map.delayMarkPoint({ coords: this.department.coords, preset: 'pmblm' })
            }
        },
        markSelected: function(val) {
            this.markPointOpacity(true);
            this.regions.forEach(function(r) { r.markSelected(val) })
            if (this.place) {
                if (!val) this.place.balloon.close();
            }
            return this;
        },
        render: function() {
            Core.trigger('department.select', { department: this })
        },
        show: function(val) {
            if (this.place) this.place.options.set('visible', val)
        },
        number: function() {
            return this.department.number
        },
    }

    function psector(s) {
        this.sector = s;
        this.name = s.name.capitalizeAll()
    }
    psector.prototype = {
        draw: function() {
            if (!map || !window.ymaps) return;
            var that = this;
            var s = this.sector;
            if (s.place) map.geoObjects.remove(s.place);
            if (!s.coords) return
            var place = constructPlace(s, 'sector', s.coords);
            this.place = place;
            place.events.add('click', function() { that.select(true) })
            map.geoObjects.add(place);
        },
        select: function(focus, noRenderSector) {
            var s = this;
            if (window.ymaps) {
                if (focus && s.sector.coords) {
                    if (map) map.setCenter(s.sector.coords)
                        //if (s.place)  s.place.balloon.open();
                }
                if (sselected) sselected.markSelected(false);
                sselected = this.markSelected(true);
            } else {
                if (this.sector.coords && focus)
                    map.markPoint({ coords: this.sector.coords, preset: 'pmgrs' })
            }
            if (!noRenderSector && s.region) s.region.render();
            s.render(focus)
        },
        render: function(focus) {
            Core.trigger('sector.select', { sector: this, focus: focus })
        },
        show: function(val) {
            if (this.place) this.place.options.set('visible', val)
        },
        markSelected: function(val) {
            if (window.ymaps) {
                if (this.place) {
                    if (!val) this.place.balloon.close();
                    this.place.options.set('visible', val)
                }
            } else {
                if (this.sector.coords)
                    map.delayMarkPoint({ coords: this.sector.coords, preset: 'pmgrs' })
            }
            return this;
        }
    }

    function parea(a) { this.area = a }
    parea.prototype = {
        draw: function() {
            if (!map || !window.ymaps) return;
            var a = this.area;
            if (a.pol) map.geoObjects.remove(a.pol);
            var pol = new ymaps.Polygon([a.coords, []], { hintContent: a.name }, { zIndex: 0, strokeOpacity: 0.7, fillOpacity: 0, strokeColor: '#592167', strokeWidth: 2 });
            this.pol = pol;
            map.geoObjects.add(pol);
        },
        show: function(val) {
            this.pol.options.set('visible', val)
        }
    }
    return {
        wrapRegion: function(r) {
            return new pregion(r)
        },
        wrapArea: function(r) {
            return new parea(r)
        },
        wrapSector: function(r) {
            return new psector(r)
        },
        wrapDepartment: function(r) {
            return new pdepartment(r)
        }
    }
})()
