from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import urllib3
import random

urllib3.disable_warnings()
app = Flask(__name__)

# إعداد بيانات حساب Hetzner
HETZNER_USER = 'virrn.me'
HETZNER_PASS = 'Hussein12190386Aa@@'
SMS_SENDER = 'HUSSEIN'  # اسم المرسل

def send_sms_otp(phone: str) -> dict:
    try:
        country_code = phone[:3]
        number = phone[3:]

        session = requests.Session()
        session.verify = False

        # تسجيل دخول
        r = session.get('https://konsoleh.your-server.de/')
        soup = BeautifulSoup(r.text, 'html.parser')
        csrf_name  = soup.find('input', {'name': '_csrf_name'})['value']
        csrf_token = soup.find('input', {'name': '_csrf_token'})['value']

        session.post('https://konsoleh.your-server.de/login.php', data={
            '_csrf_name'         : csrf_name,
            '_csrf_token'        : csrf_token,
            'login_user_inputbox': HETZNER_USER,
            'login_pass_inputbox': HETZNER_PASS,
            'level'              : 'domain',
        }, allow_redirects=True)

        # صفحة SMS
        sms_page = session.get('https://konsoleh.your-server.de/sms_gateway.php?action=newsms')
        soup2 = BeautifulSoup(sms_page.text, 'html.parser')
        csrf_name2  = soup2.find('input', {'name': '_csrf_name'})['value']
        csrf_token2 = soup2.find('input', {'name': '_csrf_token'})['value']

        # توليد OTP
        otp = random.randint(1000, 9999)
        text_message = f'كود التحقق: {otp}'

        # إرسال الرسالة
        result = session.post(
            'https://konsoleh.your-server.de/sms_gateway.php',
            data={
                'action'              : 'sendsms',
                'PREFIX_MOBILE_NUMBER': country_code,
                'country'             : country_code,
                'MOBILE_NUMBER'       : number,
                'SMS_SENDER'          : SMS_SENDER,
                'SMS_TEXT'            : text_message,
                'counter'             : str(160 - len(text_message)),
                '_csrf_name'          : csrf_name2,
                '_csrf_token'         : csrf_token2,
            }
        )

        soup3 = BeautifulSoup(result.text, 'html.parser')
        content = soup3.find(id='content')
        if content:
            text_result = content.text.strip()
            if 'erfolgreich' in text_result:
                return {'success': True, 'otp': otp, 'message': 'تم إرسال الرسالة بنجاح!'}
            else:
                return {'success': False, 'message': f'فشل الإرسال: {text_result[:200]}'}

        return {'success': False, 'message': 'لم يتم تلقي أي رد من السيرفر.'}

    except Exception as e:
        return {'success': False, 'message': str(e)}

# نقطة الوصول API
@app.route('/send-otp', methods=['POST'])
def api_send_otp():
    data = request.json
    phone = data.get('phone')
    if not phone or len(phone) < 8:
        return jsonify({'success': False, 'message': 'رقم الهاتف غير صالح.'})
    
    result = send_sms_otp(phone)
    return jsonify(result)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)