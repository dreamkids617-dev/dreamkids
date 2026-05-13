import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(JSON.stringify({ requestId, event: "request_start", method: req.method }));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Content-Type": "application/json",
  };

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { institution_id, institution_name, message, parent_email } = body;

    if (!institution_id || !institution_name) {
      return new Response(
        JSON.stringify({ error: "institution_id and institution_name are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(JSON.stringify({ requestId, event: "processing_inquiry", institution_id, institution_name }));

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin emails from profiles table (admins and super_admins)
    const { data: admins, error: adminError } = await supabase
      .from("profiles_ffc7da1b64")
      .select("email, name")
      .in("role", ["super_admin", "admin"])
      .eq("is_active", true)
      .eq("is_approved", true);

    if (adminError) {
      console.log(JSON.stringify({ requestId, event: "admin_query_error", error: adminError }));
      return new Response(
        JSON.stringify({ error: "Failed to fetch admin list", detail: adminError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!admins || admins.length === 0) {
      console.log(JSON.stringify({ requestId, event: "no_admins_found" }));
      return new Response(
        JSON.stringify({ success: true, message: "No active admins to notify" }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Check SMTP configuration
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom = Deno.env.get("SMTP_FROM");
    const smtpSecure = Deno.env.get("SMTP_SECURE") !== "false";

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.log(JSON.stringify({ requestId, event: "smtp_not_configured" }));
      // Still log the notification attempt even if SMTP is not configured
      await supabase.from("admin_logs_ffc7da1b64").insert({
        admin_email: "system",
        action: "문의 알림 시도",
        detail: `${institution_name} - SMTP 미설정으로 이메일 발송 실패. 관리자: ${admins.map(a => a.email).join(", ")}`,
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "SMTP not configured. Please set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables.",
          admins_to_notify: admins.map(a => a.email),
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || "587"),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    const adminEmails = admins.map(a => a.email);

    // Send email to all admins
    const emailHtml = `
      <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">📩 새로운 문의가 접수되었습니다</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 80px;">기관명</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${institution_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">문의 내용</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${message || "입학 상담을 요청합니다."}</td>
            </tr>
            ${parent_email ? `<tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">학부모</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${parent_email}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">접수 시간</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${now}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 12px; background: #eef2ff; border-radius: 8px;">
            <p style="margin: 0; color: #4f46e5; font-size: 12px;">
              관리자 페이지에서 문의 내역을 확인하고 답변해주세요.
            </p>
          </div>
        </div>
      </div>
    `;

    const mailResult = await transporter.sendMail({
      from: smtpFrom || smtpUser,
      to: adminEmails.join(", "),
      subject: `[Dream Kids Studio] 새 문의 접수 - ${institution_name}`,
      html: emailHtml,
    });

    console.log(JSON.stringify({ requestId, event: "email_sent", messageId: mailResult.messageId, recipients: adminEmails }));

    // Log the notification
    await supabase.from("admin_logs_ffc7da1b64").insert({
      admin_email: "system",
      action: "문의 알림 발송",
      detail: `${institution_name} 문의 → ${adminEmails.join(", ")}`,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent", recipients: adminEmails }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error(JSON.stringify({ requestId, event: "error", error: String(error) }));
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(error) }),
      { status: 500, headers: corsHeaders }
    );
  }
});