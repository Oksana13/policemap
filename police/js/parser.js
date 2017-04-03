'use strict'
$(function() {
    loading(true)
    API.all(function(args) {
        console.warn(args)
        var types = API.types,
            datas = args,
            $history = $('#history-list'),
            $th, renderSaveButtons;
        var typearr = [];
        var templates = Common.getTemplates();
        for (var key in types) {
            typearr.push(types[key])
        }
        var $ttoggles = $('#types-toggle').html(Mustache.render(templates.types, typearr))
        $ttoggles.find('a').on('click', function() {
            renderValues(typearr[$(this).index()]);
            $(this).addClass('selected').siblings().removeClass('selected')
        }).eq(0).trigger('click');
        $('#values-editor').on('scroll', function() {
            var top = $(this).scrollTop()
            $th.css('top', top + 'px')
            console.log(top)
        })

        function renderValues(type) {
            var actions = [];
            var fields = type.fields.filter(function(f) {
                return f.edit;
            })
            var target = datas[type.ds];
            var values = target.map(function(o) {
                var cells = fields.map(function(f, j) {
                    var setVal = function(val) {
                        if (val && val.trim) val = val.trim()
                        this.val = val;
                        this.item[this.field.name] = val;
                        this.text = (val) ? (f.template) ? Mustache.render(f.template, val) : val : '';
                    }
                    var cell = { ind: j, field: f, width: f.width, setVal: setVal, item: o }
                    cell.setVal(o[f.name]);
                    return cell;
                })
                return { item: o, cells: cells }
            })
            var res = { fields: fields, values: values },
                sortField = { name: fields[0].name, desc: false };
            render()

            function render() {
                $ttoggles.removeClass('locked');
                console.log('render', sortField.name, values)
                values.sort(function(_a, _b) {
                    var a = (sortField.desc ? _a : _b).item[sortField.name] || '',
                        b = (sortField.desc ? _b : _a).item[sortField.name] || '';
                    return a < b ? -1 : a > b ? 1 : 0;
                })
                var $res = $('#values-editor').html(Mustache.render(templates.values, res));
                $th = $res.find('.table-header');
                $res.find('.table-cell').on('click', function() {
                        var $this = $(this),
                            ind = Number($this.attr('data-field-ind')),
                            field = fields[ind];
                        if (field.ds) {
                            var $ds = $(Mustache.render(templates.ds, datas[field.ds])).appendTo($this)
                        }
                    })
                    .on('focus', function() {
                        var $this = $(this).addClass('edited')
                        $this.data('oldtext', $this.text().trim())
                        $this.parent().addClass('current').siblings().removeClass('current');
                    })
                    .on('blur', function() {
                        var $this = $(this).removeClass('edited'),
                            ind = Number($this.attr('data-field-ind')),
                            itemind = $this.parent().index(),
                            item = values[itemind],
                            cell = item.cells[ind],
                            field = fields[ind],
                            text = $(this).text().trim(),
                            oldtext = $this.data('oldtext'),
                            val = (field.convert) ? field.convert(text) : text;
                        //console.warn(text, oldtext)
                        if (text != oldtext) {
                            var action = { type: type.name, cell: cell, $cell: $this, old: cell.val, name: cell.item.name, val: val, title: '"{0}" изменено'.format(field.title) };
                            cell.setVal(val);
                            Core.trigger('history.push', action)
                            $ttoggles.addClass('locked');
                            //console.log('changed', cell)
                            //console.log(actions)
                        }
                        $this.html(cell.text)
                    })
                $res.find('.header-cell').on('click', function() {
                    var fname = fields[$(this).index()].name;
                    if (sortField.name == fname)
                        sortField.desc = !sortField.desc;
                    else {
                        sortField.name = fname;
                        sortField.desc = false;
                    }
                    render()
                })
                renderHistory()
                renderSaveButtons = function() {
                    $('#btn-cancel').on('click', update)
                    $('#btn-save').on('click', function() {
                        API.save(type.ds, datas[type.ds], function() {
                            Core.trigger('mess', { mess: '"{0}" сохранены'.format(type.title) })
                            update()
                        }, function() {
                            Core.trigger('mess', { error: true, mess: 'Ошибка! "{0}" НЕ сохранены'.format(type.title) })
                        })
                    })
                }

                function update() {
                    loading(true)
                    API.requests[type.ds]().success(function(data) {
                        datas[type.ds] = data;
                        console.log('update ', type.name, data)
                        actions = []
                        renderHistory()
                        renderValues(type)
                    })
                }

                function renderHistory() {
                    Core.trigger('history.render', { actions: actions, $history: $history, templates: templates })
                }
                loading(false)
            }
        }
        Core.on('history.rendered', function() {
            if (renderSaveButtons) renderSaveButtons()
        })
        Core.on('history.setAction', function(args) {
            console.log('set action', args);
            var a = args.action;
            a.cell.setVal(args.val)
            a.$cell.html(a.cell.text)
        })
    })
    $('#btn-operations').on('click', function() {
        $(this).toggleClass('selected');
    })

    function loading(val) {
        $('.all').toggleClass('loading', val)
    }
    var mtimeout, $mess = $('#mess');
    Core.on('mess', function(args) {
        $mess.html(args.mess).addClass('shown').toggleClass('warn', !!args.warn).toggleClass('error', !!args.error);
        clearTimeout(mtimeout)
        mtimeout = setTimeout(function() { $mess.removeClass('shown') }, 3000)
    })
    window.onerror = function() {
        Core.trigger('mess', { mess: 'Все совсем плохо. Ошибка в скриптах', error: true })
    }
})
$(function() {
    $('#btn-ank').on('click', function() { regions() })
        //regions()
    function regions(success) {
        $.when($.getJSON("data/poligoni_rayonov.geojson"),
                $.getJSON("data/tochki_otdelov.geojson"),
                $.getJSON("data/otdeleniya.geojson"),
                $.get("data/otdeleniya.tsv"),
                $.get("data/anketa1.tsv"),
                $.get("data/anketa2.tsv"),
                $.get("data/departments.tsv")
            )
            .done(function(a, b, c, c1, c2, c3, d) {
                var regions = [],
                    region_points = [],
                    sectors = [],
                    areas = [];
                var mo = a[0].features;
                var potds = b[0].features;
                var otds = c[0].features;
                var oinfo = parseCSV(c1[0]);
                var ank1 = c2[0];
                var ank2 = c3[0];
                var deps = parseCSV(d[0])
                var _regions = {}
                for (var i = 0; i < otds.length; i++) {
                    var o = otds[i];
                    if (!o.geometry || !o.properties._2name) {
                        console.warn('кривые отделения в карто', o)
                        continue;
                    }
                    var coords = convertCoords(o.geometry.coordinates[0][0]);
                    //console.log(o.properties)
                    var _otd = {
                        number: parseInt(o.properties._1number),
                        name: o.properties._2name.trim().toLowerCase(),
                        coords: coords,
                    }
                    if (!_otd.number)
                        _otd.number = parseInt(_otd.name)
                    if (!_otd.number) {
                        console.warn('нет номера')
                        continue
                    }
                    _otd.id = _otd.number;
                    var rn = _regions[_otd.number];
                    if (rn) {
                        console.warn('дубликат', _otd.number)
                        rn.coords = coords.concat(rn.coords)
                    } else {
                        regions.push(_otd)
                        _regions[_otd.number] = _otd;
                    }
                }
                var getVal = function(val) {
                    if (!val) return;
                    return val.toLowerCase().trim()
                }
                var getv = function(val) {
                    return val ? val.trim() : null;
                }
                for (var i = 0; i < oinfo.length; i++) {
                    var o = oinfo[i],
                        area = o[0],
                        name = o[1];
                    if (!name) continue;
                    name = name.trim()
                    var num = parseInt(name)
                    var reg = _regions[num];
                    if (!reg) continue;
                    reg.name = name;
                    reg.area = getVal(o[0]);
                    reg.addr = getv(o[2])
                    reg.tel = [getv(o[3]), getv(o[4]), getv(o[5])].filter(function(o) {
                        return !!o
                    })
                    reg.personName = getv(o[7]);
                    reg.personRank = getv(o[6]);
                    reg.personTel = getv(o[8]);
                    reg.personTime = getv(o[9]);
                    reg.lastInspect = getv(o[10])
                    if (o[14]) {
                        var press = o[14].split(/\s*([0-9]+\))\s*/).filter(function(s) {
                            return s.length > 3
                        })
                        reg.press = press.map(function(p) {
                            var spl = p.split('http');
                            return [spl[0], spl[1] ? 'http' + spl[1].replace(';', '') : '']
                        })
                    }
                    //console.log(reg.press)
                }
                //console.log(_regions)
                var anfields = [],
                    anvalues = {};

                function parseAnk(ank, category) {
                    var ank = parseCSV(ank);
                    //console.log(ank)
                    ank.slice(1).forEach(function(v) {
                        var name = v[0].trim().toLowerCase();
                        var number = parseInt(name),
                            vals = anvalues[number];
                        if (!vals) vals = []
                        var r = _regions[number] //regions.filter(function(r) { return r.name.indexOf(number) == 0})[0]
                        if (!r)
                            console.warn('нет соответствия в карто', name, number);
                        else {
                            vals = vals.concat(v.slice(2).map(function(o) {
                                return o.toLowerCase() == 'да'
                            }))
                            anvalues[number] = vals;
                        }
                        //v[0] = r.name
                    })
                    var fields = ank[0].slice(2).map(function(f) {
                        return { title: f, category: category, weight: Math.round(Math.random() * 5) }
                    });
                    anfields = anfields.concat(fields)
                }
                console.log('Парсим первую анкету')
                parseAnk(ank1, 'информация')
                console.log('Парсим вторую анкету')
                parseAnk(ank2, 'доступность')
                console.log('Вопросы', anfields)
                console.log('Ответы', anvalues)
                for (var i = 0; i < mo.length; i++) {
                    var o = mo[i];
                    //console.log(o)
                    if (o.geometry)
                        var coords = convertCoords(o.geometry.coordinates[0][0]);
                    areas.push({
                        name: o.properties._1name,
                        coords: coords
                    })
                }
                for (var i = 0; i < potds.length; i++) {
                    var po = potds[i];
                    //console.log(po)
                    var number = po.properties.number;
                    var name = o.properties.name;
                    var r = _regions[number];
                    if (!r) {
                        console.warn('кривая точка отделения', po.properties)
                        continue;
                    }
                    if (!name && r) {
                        name = _regions[number].name;
                    }
                    r.point = { coords: convertCoords([po.geometry.coordinates])[0] }
                }
                var departments = []
                for (var i = 0; i < deps.length; i++) {
                    var d = deps[i],
                        num = parseInt(d[0]),
                        name = getv(d[1]);
                    if (!num || !name) continue;
                    //console.log(d[3].split(','))
                    var dregs = d[3].split(',').map(function(o) {
                        var num = parseInt(o)
                        return num;
                    }).filter(function(o) {
                        return !!o
                    })
                    var dep = {
                        addr: getv(d[2]),
                        number: num,
                        name: name,
                        regions: dregs,
                        email: getv(d[4]),
                        personName: getv(d[5]),
                        personTel: getv(d[6]),
                        tel: getv(d[7]).split(',')
                    }
                    departments.push(dep)
                        //console.log(dep)
                }
                //return;
                save('regions', regions)
                save('areas', areas)
                save('anfields', { fields: anfields })
                save('anvalues', anvalues)
                save('departments', departments)
            })
    }
    $('#btn-resolve-dep').on('click', function() {
        $.getJSON("data/resolved/departments.json".format(), function(data) {
            resolveSectors(data, function() {
                save('departments', data)
            })
        })
    })

    function save(key, data) {
        API.save(key, data, function(res) {
            console.info('Cохранилось', key, data)
        })
    }
    $('#btn-resolve-spb').on('click', function() { prepareSectors(7800000000000, 'spb') })
    $('#btn-resolve-msc').on('click', function() { prepareSectors('msc') })
    $('#btn-resolve-vo').on('click', function() { prepareSectors('vo') })
        //prepareSectors(7800000000000, 'spb') 
    function prepareSectors(sub, city) {
        function parseOptions(data) {
            var arr = []
            $(data.list).each(function() {
                var $this = $(this);
                //var str = { val : $this.attr('value'), name : $this.text().trim() };
                arr.push($this.text().trim())
            })
            return arr;
        }
        $.getJSON("data/sectors-parsed/ment-{0}.json".format(city), function(pots) {
            pots.forEach(function(p) {
                var street, pstr = p.streets;
                p.streets.forEach(function(s, i) {
                    var ind = 2;
                    if (s[2]) {
                        var m = s[2].match(/ *\([^)]*\) */g, "")
                        if (m) ind = 3;
                    }
                    var numbers = s.slice(ind)
                    var name = s[ind - 1]
                    var subcity = s[ind - 3] ? s[ind - 2] : null;
                    var str = { numbers: numbers, name: name, subcity: subcity }
                    p.streets[i] = str;
                    //console.log(str)
                })
            })
            console.log(city, 'ресловим сектора', pots)
            resolveSectors(pots, function() {
                save('sectors', pots)
            })
        })
    }

    function resolveSectors(pots, success) {
        var ind = 0;
        //pots = pots.slice(0,3)
        var url = 'https://geocode-maps.yandex.ru/1.x/?geocode={0}&format=json';
        var resolve = function() {
            var p = pots[ind]
            if (!p) {
                console.log('resolve complete');
                success()
                return;
            }
            $.getJSON(url.format(p.addr), function(data) {
                var res = data.response.GeoObjectCollection.featureMember[0]
                if (res) {
                    p.raddr = res.GeoObject.name
                    var coords = res.GeoObject.Point;
                    if (coords)
                        p.coords = coords.pos.split(' ').map(function(x) {
                            return Number(x)
                        }).reverse()
                    console.log(ind, p.addr, p.raddr, p.coords)
                } else {
                    console.warn(ind, p.addr, 'Not resolved')
                }
                ind++;
                setTimeout(resolve, 2000);
            }).error(function() {
                ind++;
                setTimeout(resolve, 2000);
            })
        }
        resolve()
    }

    function convertCoords(coords) {
        if (coords) {
            for (var j = 0; j < coords.length; j++) {
                var cc = coords[j];
                coords[j] = [cc[1], cc[0]]
            }
        }
        return coords;
    }
    $('#btn-sectors-spb').on('click', function() { parseSectors(7800000000000, 'spb') })
    $('#btn-sectors-msc').on('click', function() { parseSectors(7700000000000, 'msc') })
    $('#btn-sectors-vo').on('click', function() { parseSectors(3600000000000, 'vo') })
        //parseSectors(7800000000000, 'spb')
    function parseSectors(sub, city) {
        console.log('начинаем ддосить ' + city)
        var offset = 0,
            size = 10;
        var url = 'https://xn--b1aew.xn--p1ai/district/search';
        var res = [];
        var form = 'subject={1}&subzone=&city=&street=&offset={0}&address=';
        var parse = function() {
            $.post(url, form.format(offset * size, sub), function(data) {
                var $list = $(JSON.parse(data).list).filter(function(i) {
                    return $(this).hasClass('sl-holder')
                });
                if (!$list.length) {
                    console.log('complete')
                        //download('ment{0}).json'.format(sub), res)
                    save('sectors-parsed-' + city, res)
                    return
                }
                $list.each(function() {
                    var $this = $(this)
                    var $photo = $this.find('img');
                    if ($photo[0]) {
                        var name = $this.find('.sl-item-title b').eq(0).text().trim()
                        var rank = $this.find('.sl-item-subtitle').text().trim()
                        var $b = $this.find('.open-map').prevAll('b');
                        var tel = [],
                            addr;
                        $b.each(function(i) {
                            var txt = $b.eq(i).text().trim();
                            if (i == 0)
                                addr = txt //.split(',').filter(function(o, i) { return i > 0 && o.trim()}) ;
                            else
                                tel.push(txt);
                        })
                        var time = $this.find('.sl-list').eq(0).find('p').text().trim();
                        var streets = []
                        $this.find('.sl-list-column .map-child').each(function() {
                            var spl = $(this).text().split(',');
                            spl.forEach(function(s, i) { spl[i] = s.trim() })
                            streets.push(spl);
                        })
                        var o = { photo: $photo.attr('src'), name: name, rank: rank, tel: tel, addr: addr, streets: streets, time: time }
                        console.log(o.name, o.addr, o.tel)
                        res.push(o)
                    }
                })
                console.log('offset', offset, res.length)
                offset++;
                setTimeout(parse, 3000)
            })
        }
        parse()
    }

    function download(name, data, nojson) {
        var pom = document.createElement('a');
        if (!nojson)
            data = JSON.stringify(data);
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
        var d = new Date().format()
            //pom.setAttribute('download', '{1}_{0}.json'.format(d, name));
        pom.setAttribute('download', name);
        if (document.createEvent) {
            var event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        } else {
            pom.click();
        }
    }
})

function parseCSV(str) {
    var x = str.split('\n');
    for (var i = 0; i < x.length; i++) {
        x[i] = x[i].split('\t');
    }
    return x;
}
