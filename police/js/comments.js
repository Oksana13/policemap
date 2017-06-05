Core.on('init', function(args) {
    var $comments = $('#comments-popup'),
        templates = args.templates;

    function getUnapprovedComments() {
        if (!DBApi.getUnapprovedComments) return;
        DBApi.getUnapprovedComments(function(comments) {
            prepareComments(comments);
            var $items = $comments.html(Mustache.render(templates.commentsPopup, comments)).find('.comment').on('click', function() {
                $(this).toggleClass('expanded').siblings().removeClass('expanded');
            })
            initControls($items, true)
            $('#comments-toggle').on('click', function() {
                $comments.toggleClass('expanded')
            })

        })
    }

    function initControls($items, hide) {
        $items.find('.btn-accept, .btn-reject').on('click', function(e) {
            var $this = $(this),
                accept = $this.hasClass('btn-accept'),
                id = $this.attr('data-comment-id');
            DBApi.acceptComment(id, accept, function() {
                $this.parents('.comment').slideUp(300, function() {
                    if (hide) {
                        $(this).remove()
                        if (!$items.find('.comment').length) $comments.remove()
                    }
                })
            })
        })

    }
    setTimeout(getUnapprovedComments, 5000)

    function trim(text) {
        return $('<b>{0}</b>'.format(text)).text().trim();
    }

    function renderRegionComments(reg) {
        var $items = $('#region-comments').html(Mustache.render(templates.regionComments, reg.comments))
            .find('.comment').on('click', function() {
                $(this).toggleClass('expanded')
            })
        initControls($items);
        var $btnSubmit = $('#region-comment-submit').on('click', function() {
            var txt = trim($('#region-comment-text').val()),
                name = trim($('#region-comment-name').val());

            if (!txt || !name) {
                Core.trigger('mess', { warn: true, mess: 'Имя и/или текст комментария не заполнены!' })
                return;
            }
            var comment = {
                text: txt,
                name: name,
                target: reg.region.number,
            }
            $btnSubmit.addClass('btn-loading');
            DBApi.postComment(comment, function() {
                reg.comments.push(comment);
                renderRegionComments(reg)
            }).done(function() {
                $btnSubmit.removeClass('btn-loading');
            })
        })
    }

    function prepareComments(comments) {
        comments.forEach(function(c) {
            c.text = trim(c.text);
            c.name = trim(c.name);
            c.createdDate = (new Date(c.created)).fineFormat();
            c.acceptedTitle = c.accepted === true ? 'принят' : c.accepted === false ? 'отклонен' : 'не обработан';
        })
        Common.sortByField(comments, 'created')
        return comments;
    }
    Core.on('details.rendered', function(arg) {
        var reg = arg.region;
        if (!reg.comments) {
            DBApi.getCommentsByTargetId(reg.region.number, function(comments) {
                console.warn('comments', comments)
                prepareComments(comments)
                reg.comments = comments;
                renderRegionComments(reg)
            })
        } else {
            renderRegionComments(reg)
        }
    })
})
