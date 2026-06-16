from flask import Blueprint, jsonify, request, send_file


def create_pages_blueprint(pages, logger):
    bp = Blueprint('pages', __name__)

    @bp.route('/pages/list', methods=['GET'])
    def pages_list():
        try:
            return jsonify({'pages': pages.list_pages()})
        except Exception as e:
            logger.error(f"Failed to list pages: {e}")
            return jsonify({'error': str(e)}), 500

    @bp.route('/pages/content', methods=['GET'])
    def pages_content():
        path = request.args.get('path', '').strip()
        if not path:
            return jsonify({'error': 'path is required'}), 400
        try:
            page = pages.read_page(path)
            page['backlinks'] = pages.get_backlinks(path)
            return jsonify(page)
        except FileNotFoundError:
            return jsonify({'error': 'page not found'}), 404
        except Exception as e:
            logger.error(f"Failed to read page {path}: {e}")
            return jsonify({'error': str(e)}), 500

    @bp.route('/pages/asset', methods=['GET'])
    def pages_asset():
        name = request.args.get('name', '').strip()
        if not name:
            return jsonify({'error': 'name is required'}), 400
        full = pages.resolve_asset(name)
        if not full:
            return jsonify({'error': 'asset not found'}), 404
        return send_file(full)

    return bp
