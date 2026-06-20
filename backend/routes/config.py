import os
import subprocess
import sys
import threading
import time
from flask import Blueprint, jsonify, request
from dotenv import dotenv_values, set_key

ENV_FIELDS = {
    'vault_path':           'OBSIDIAN_VAULT_PATH',
    'inbox_path':           'OBSIDIAN_INBOX_PATH',
    'imploding_tasks_path': 'OBSIDIAN_IMPLODING_TASKS_PATH',
    'daily_path':           'OBSIDIAN_DAILY_PATH',
    'habits_path':          'OBSIDIAN_HABITS_PATH',
    'archive_path':         'OBSIDIAN_ARCHIVE_PATH',
    'reviews_path':         'OBSIDIAN_REVIEWS_PATH',
    'assets_path':          'OBSIDIAN_ASSETS_PATH',
    'food_path':            'OBSIDIAN_FOOD_PATH',
    'food_assets_path':     'OBSIDIAN_FOOD_ASSETS_PATH',
    'finance_path':         'OBSIDIAN_FINANCE_PATH',
    'subscriptions_path':   'OBSIDIAN_SUBSCRIPTIONS_PATH',
    'pushover_api_token':   'PUSHOVER_API_TOKEN',
    'pushover_user_key':    'PUSHOVER_USER_KEY',
    'spotify_client_id':    'SPOTIFY_CLIENT_ID',
    'spotify_client_secret':'SPOTIFY_CLIENT_SECRET',
    'spotify_redirect_uri': 'SPOTIFY_REDIRECT_URI',
    'daily_summary_time':   'DAILY_SUMMARY_TIME',
    'daily_habits_time':    'DAILY_HABITS_TIME',
    'host':                 'HOST',
    'port':                 'PORT',
}


def create_config_blueprint(dotenv_path: str, logger):
    bp = Blueprint('config', __name__)

    @bp.route('/config', methods=['GET'])
    def get_config():
        values = dotenv_values(dotenv_path)
        result = {key: values.get(env_key, '') for key, env_key in ENV_FIELDS.items()}
        return jsonify(result)

    @bp.route('/config', methods=['POST'])
    def update_config():
        data = request.get_json(force=True) or {}
        updated = []
        for key, value in data.items():
            if key in ENV_FIELDS:
                env_key = ENV_FIELDS[key]
                set_key(dotenv_path, env_key, str(value))
                os.environ[env_key] = str(value)
                updated.append(key)
        if updated:
            logger.info(f'Config updated: {updated}')
        return jsonify({'updated': updated})

    @bp.route('/config/restart', methods=['POST'])
    def restart_server():
        def _do_restart():
            time.sleep(0.4)
            os.execv(sys.executable, [sys.executable] + sys.argv)
        threading.Thread(target=_do_restart, daemon=True).start()
        return jsonify({'ok': True})

    @bp.route('/config/pick-folder', methods=['POST'])
    def pick_folder():
        if sys.platform != 'darwin':
            return jsonify({'error': 'Folder picker only supported on macOS'}), 400
        # JXA with activate() ensures the dialog comes to the foreground
        # regardless of which app is currently focused.
        jxa_script = (
            'var app = Application.currentApplication();'
            'app.includeStandardAdditions = true;'
            'app.activate();'
            'app.chooseFolder({withPrompt: "Select vault root folder"}).toString();'
        )
        try:
            result = subprocess.run(
                ['osascript', '-l', 'JavaScript', '-e', jxa_script],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode != 0:
                stderr = result.stderr.strip()
                if 'User canceled' in stderr or 'cancelled' in stderr.lower():
                    return jsonify({'error': 'cancelled'}), 400
                logger.warning(f'pick-folder failed: {stderr}')
                return jsonify({'error': stderr or 'failed'}), 400
            path = result.stdout.strip().rstrip('/')
            return jsonify({'path': path})
        except subprocess.TimeoutExpired:
            return jsonify({'error': 'timeout'}), 400
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return bp
