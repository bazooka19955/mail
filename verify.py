from flask import Flask, request, jsonify
import random
import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings()

app = Flask(__name__)

# تخزين OTP مؤقت (للتجربة فقط)
otp_store = {}

def send_sms_hetzner(country_code, number, text, sender='VIRRN'):
    session = requests.Session()
    session.verify = False

    # تسجيل الدخول
    r = session.get('https://konsoleh.your-server.de/')
    soup = BeautifulSoup(r.text, 'html.parser')
    csrf_name = soup.find('input', {'name': '_csrf_name'})['value']
    csrf_token = soup.find('input', {'name': '_csrf_token'})['value']

    login_resp = session.post(
        'https://konsoleh.your-server.de/login.php',
        data={
            '_csrf_name': csrf_name,
            '_csrf_token': csrf_token,
            'login_user_inputbox': 'VIRRN.ME',  # ضع حسابك هنا
            'login_pass_inputbox': 'Hussein12190386Aa@@',  # ضع كلمة مرورك
            'level': 'domain',
        },
        allow_redirects=True
    )

    # تحقق من Login
    if "Login fehlgeschlagen" in login_resp.text:
        return False, "Login failed"

    # جيب CSRF جديد للـ SMS
    sms_page = session.get('https://konsoleh.your-server.de/sms_gateway.php?action=newsms')
    soup2 = BeautifulSoup(sms_page.text, 'html.parser')
    csrf_name2 = soup2.find('input', {'name': '_csrf_name'})['value']
    csrf_token2 = soup2.find('input', {'name': '_csrf_token'})['value']

    # إرسال SMS
    result = session.post(
        'https://konsoleh.your-server.de/sms_gateway.php',
        data={
            'action': 'sendsms',
            'PREFIX_MOBILE_NUMBER': country_code,
            'country': country_code,
            'MOBILE_NUMBER': number,
            'SMS_SENDER': sender,
            'SMS_TEXT': text,
            'counter': str(160 - len(text)),
            '_csrf_name': csrf_name2,
            '_csrf_token': csrf_token2,
        }
    )

    soup3 = BeautifulSoup(result.text, 'html.parser')
    content = soup3.find(id='content')
    if content and 'erfolgreich' in content.text:
        return True, "Sent successfully"
    else:
        return False, content.text.strip() if content else "Unknown error"

@app.route('/send_otp', methods=['POST'])
def send_otp():
    data = request.json
    phone = data.get('phone')
    country = data.get('country', '964')
    if not phone:
        return jsonify({'success': False, 'message': 'Phone number required'}), 400

    # توليد OTP عشوائي 4 أرقام
    otp = str(random.randint(1000, 9999))
    text = f"Your verification code is: {otp}"

    success, msg = send_sms_hetzner(country, phone, text)
    if success:
        otp_store[phone] = otp
        return jsonify({'success': True, 'message': 'OTP sent'})
    else:
        return jsonify({'success': False, 'message': msg})

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.json
    phone = data.get('phone')
    otp = data.get('otp')
    if otp_store.get(phone) == otp:
        del otp_store[phone]  # حذف OTP بعد التحقق
        return jsonify({'success': True, 'message': 'Verified successfully'})
    else:
        return jsonify({'success': False, 'message': 'Invalid OTP'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
