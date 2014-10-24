function insert(item, user, request) {
    if (!item.postid) {
        request.respond(400, { error: 'comments must have a postid' });
        return;
    }

    request.execute({
        success: function () {
            mssql.query("update [blog_posts] set commentcount = (select count(*) from [blog_comments] where postId = ?) where id = ?", [item.postid, item.postid], {
                    success: function () {
                        request.respond();                        
                    }
                }
            );
        }
    });
}
