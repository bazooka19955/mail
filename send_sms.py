from flask import Flask, request, jsonify
import os
import requests
from bs4 import BeautifulSoup
import urllib3
import random

urllib3.disable_warnings()

app = Flask(__name__)

# ===== دالة إرسال SMS عبر Hetzner =====
def send_sms(number, otp, sender="MyApp"):
    """
    number: رقم الهاتف بدون صفر أولي
    otp: كود التحقق 4 أرقام
    sender: اسم المرسل
    """
    session = requests.Session()
    session.verify = False

    try:
        # 1- الدخول للوحة konsoleH
        r = session.get('https://konsoleh.your-server.de/')
        soup = BeautifulSoup(r.text, 'html.parser')
        csrf_name = soup.find('input', {'name': '_csrf_name'})['value']
        csrf_token = soup.find('input', {'name': '_csrf_token'})['value']

        # 2- تسجيل دخول
        login_data = {
            '_csrf_name': csrf_name,
            '_csrf_token': csrf_token,
        'login_user_inputbox': 'virrn.me',
        'login_pass_inputbox': 'Hussein12190386Aa@@',
        'level'              : 'domain',
        }
        login_resp = session.post('https://konsoleh.your-server.de/login.php', data=login_data, allow_redirects=True)

        if "Logout" not in login_resp.text:
            return False, "❌ تسجيل الدخول فشل!"

        # 3- الحصول على CSRF جديد لإرسال SMS
        sms_page = session.get('https://konsoleh.your-server.de/sms_gateway.php?action=newsms')
        soup2 = BeautifulSoup(sms_page.text, 'html.parser')
        csrf_name2 = soup2.find('input', {'name': '_csrf_name'})['value']
        csrf_token2 = soup2.find('input', {'name': '_csrf_token'})['value']

        # 4- إرسال SMS
        sms_text = f"رمز التحقق الخاص بك: {otp}"
        sms_data = {
            'action': 'sendsms',
            'PREFIX_MOBILE_NUMBER': '964', # مثال: العراق
            'country': '964',
            'MOBILE_NUMBER': number,
            'SMS_SENDER': sender,
            'SMS_TEXT': sms_text,
            'counter': str(160 - len(sms_text)),
            '_csrf_name': csrf_name2,
            '_csrf_token': csrf_token2
        }

        result = session.post('https://konsoleh.your-server.de/sms_gateway.php', data=sms_data)
        soup3 = BeautifulSoup(result.text, 'html.parser')
        content = soup3.find(id='content')
        if content and 'erfolgreich' in content.text:
            return True, f"✅ OTP {otp} تم إرساله إلى {number}"
        else:
            return False, f"❌ فشل الإرسال: {content.text[:200] if content else 'لا يوجد رد'}"

    except Exception as e:
        return False, f"❌ خطأ: {str(e)}"


# ===== Route للتحقق من OTP =====
@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.json
    number = data.get('number')
    if not number:
        return jsonify({"success": False, "message": "رقم الهاتف مفقود"}), 400

    otp = random.randint(1000, 9999)  # كود تحقق 4 أرقام
    success, message = send_sms(number, otp)
    return jsonify({"success": success, "message": message})


# ===== Main =====
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
