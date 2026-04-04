<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $phone = $_POST['phone'];
    $otp = rand(1000, 9999); // توليد كود تحقق عشوائي

    // استدعاء بايثون عبر cURL لإرسال SMS
    $data = json_encode(array("number" => $phone, "otp" => $otp));

    $ch = curl_init('https://mail-production-1970.up.railway.app/verify_otp');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

    $response = curl_exec($ch);
    curl_close($ch);

    // عرض النتيجة
    echo "<p>تم إرسال OTP إلى الرقم: $phone</p>";
    echo "<p>Response: $response</p>";
}
?>
