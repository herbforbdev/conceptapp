// services/emailService.ts
// Phase 4: Email Integration & Notifications

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailOptions {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

// Email Templates
export const emailTemplates = {
  // User Management Templates
  userInvitation: (data: { inviteeName: string; inviterName: string; companyName: string; loginUrl: string }): EmailTemplate => ({
    subject: `Invitation à rejoindre ${data.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation à rejoindre ${data.companyName}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #008080, #004c4c);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .content h2 {
              color: #004c4c;
              margin-top: 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #008080, #006666);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              margin: 20px 0;
              transition: background 0.3s ease;
            }
            .button:hover {
              background: linear-gradient(135deg, #006666, #004c4c);
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .divider {
              height: 1px;
              background-color: #e9ecef;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Vous êtes invité!</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${data.inviteeName}!</h2>
              <p><strong>${data.inviterName}</strong> vous invite à rejoindre <strong>${data.companyName}</strong> sur notre plateforme de gestion de production.</p>
              
              <p>Vous aurez accès à:</p>
              <ul>
                <li>📊 Tableau de bord de production en temps réel</li>
                <li>📦 Gestion des stocks et inventaires</li>
                <li>💰 Suivi des coûts et budgets</li>
                <li>📈 Analyses et rapports détaillés</li>
              </ul>

              <div class="divider"></div>
              
              <p style="text-align: center;">
                <a href="${data.loginUrl}" class="button">Accepter l'invitation</a>
              </p>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Cliquez sur le bouton ci-dessus pour vous connecter et commencer à utiliser la plateforme.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 ${data.companyName}. Tous droits réservés.</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Bonjour ${data.inviteeName}!

      ${data.inviterName} vous invite à rejoindre ${data.companyName} sur notre plateforme de gestion de production.

      Pour accepter cette invitation, visitez: ${data.loginUrl}

      Vous aurez accès à:
      - Tableau de bord de production en temps réel
      - Gestion des stocks et inventaires  
      - Suivi des coûts et budgets
      - Analyses et rapports détaillés

      © 2025 ${data.companyName}. Tous droits réservés.
    `
  }),

  accessRequestApproved: (data: { userName: string; companyName: string; loginUrl: string }): EmailTemplate => ({
    subject: `Demande d'accès approuvée - ${data.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Demande d'accès approuvée</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .content h2 {
              color: #28a745;
              margin-top: 0;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Demande approuvée!</h1>
            </div>
            <div class="content">
              <h2>Félicitations ${data.userName}!</h2>
              <p>Votre demande d'accès à <strong>${data.companyName}</strong> a été approuvée par notre équipe.</p>
              
              <p>Vous pouvez maintenant vous connecter et commencer à utiliser toutes les fonctionnalités de la plateforme.</p>
              
              <p style="text-align: center;">
                <a href="${data.loginUrl}" class="button">Se connecter maintenant</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 ${data.companyName}. Tous droits réservés.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Félicitations ${data.userName}!

      Votre demande d'accès à ${data.companyName} a été approuvée.

      Vous pouvez maintenant vous connecter: ${data.loginUrl}

      © 2025 ${data.companyName}. Tous droits réservés.
    `
  }),

  accessRequestRejected: (data: { userName: string; companyName: string; reason?: string }): EmailTemplate => ({
    subject: `Demande d'accès - ${data.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Demande d'accès</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #6c757d, #495057);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Demande d'accès</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${data.userName},</h2>
              <p>Merci pour votre intérêt à rejoindre <strong>${data.companyName}</strong>.</p>
              
              <p>Après examen, nous ne pouvons pas donner suite à votre demande d'accès pour le moment.</p>
              
              ${data.reason ? `<p><strong>Raison:</strong> ${data.reason}</p>` : ''}
              
              <p>N'hésitez pas à nous contacter si vous avez des questions ou si vous souhaitez soumettre une nouvelle demande ultérieurement.</p>
            </div>
            <div class="footer">
              <p>© 2025 ${data.companyName}. Tous droits réservés.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Bonjour ${data.userName},

      Merci pour votre intérêt à rejoindre ${data.companyName}.

      Après examen, nous ne pouvons pas donner suite à votre demande d'accès pour le moment.

      ${data.reason ? `Raison: ${data.reason}` : ''}

      N'hésitez pas à nous contacter pour toute question.

      © 2025 ${data.companyName}. Tous droits réservés.
    `
  }),

  // System Notification Templates
  lowStockAlert: (data: { productName: string; currentStock: number; threshold: number; adminName: string }): EmailTemplate => ({
    subject: `🚨 Alerte Stock Faible - ${data.productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Alerte Stock Faible</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc3545, #c82333);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .alert-box {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .stock-info {
              background-color: #e9ecef;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Alerte Stock Faible</h1>
            </div>
            <div class="content">
              <h2>Attention ${data.adminName}!</h2>
              
              <div class="alert-box">
                <strong>⚠️ Stock critique détecté</strong><br>
                Le stock du produit <strong>${data.productName}</strong> est en dessous du seuil d'alerte.
              </div>
              
              <div class="stock-info">
                <h3>Informations du Stock:</h3>
                <ul>
                  <li><strong>Produit:</strong> ${data.productName}</li>
                  <li><strong>Stock Actuel:</strong> ${data.currentStock} unités</li>
                  <li><strong>Seuil d'Alerte:</strong> ${data.threshold} unités</li>
                  <li><strong>Déficit:</strong> ${data.threshold - data.currentStock} unités</li>
                </ul>
              </div>
              
              <p><strong>Action recommandée:</strong> Planifiez un réapprovisionnement immédiat pour éviter une rupture de stock.</p>
            </div>
            <div class="footer">
              <p>Système de Gestion de Production</p>
              <p>Alerte automatique générée le ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      🚨 ALERTE STOCK FAIBLE

      Attention ${data.adminName}!

      Le stock du produit ${data.productName} est en dessous du seuil d'alerte.

      Informations:
      - Produit: ${data.productName}
      - Stock Actuel: ${data.currentStock} unités
      - Seuil d'Alerte: ${data.threshold} unités
      - Déficit: ${data.threshold - data.currentStock} unités

      Action recommandée: Planifiez un réapprovisionnement immédiat.

      Système de Gestion de Production
      Alerte générée le ${new Date().toLocaleDateString('fr-FR')}
    `
  }),

  budgetOverrunAlert: (data: { expenseType: string; currentAmount: number; budgetAmount: number; adminName: string; period: string }): EmailTemplate => ({
    subject: `💰 Alerte Dépassement Budget - ${data.expenseType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Alerte Dépassement Budget</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #fd7e14, #e55a00);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .alert-box {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .budget-info {
              background-color: #e9ecef;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Alerte Budget</h1>
            </div>
            <div class="content">
              <h2>Attention ${data.adminName}!</h2>
              
              <div class="alert-box">
                <strong>⚠️ Dépassement budgétaire détecté</strong><br>
                Les dépenses pour <strong>${data.expenseType}</strong> ont dépassé le budget alloué.
              </div>
              
              <div class="budget-info">
                <h3>Détails Budgétaires - ${data.period}:</h3>
                <ul>
                  <li><strong>Type de Dépense:</strong> ${data.expenseType}</li>
                  <li><strong>Budget Alloué:</strong> ${data.budgetAmount.toLocaleString('fr-FR')} USD</li>
                  <li><strong>Montant Dépensé:</strong> ${data.currentAmount.toLocaleString('fr-FR')} USD</li>
                  <li><strong>Dépassement:</strong> ${(data.currentAmount - data.budgetAmount).toLocaleString('fr-FR')} USD</li>
                  <li><strong>Pourcentage:</strong> ${Math.round((data.currentAmount / data.budgetAmount) * 100)}% du budget</li>
                </ul>
              </div>
              
              <p><strong>Action recommandée:</strong> Révisez les dépenses récentes et ajustez le budget si nécessaire.</p>
            </div>
            <div class="footer">
              <p>Système de Gestion de Production</p>
              <p>Alerte automatique générée le ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      💰 ALERTE DÉPASSEMENT BUDGET

      Attention ${data.adminName}!

      Les dépenses pour ${data.expenseType} ont dépassé le budget alloué.

      Détails - ${data.period}:
      - Type de Dépense: ${data.expenseType}
      - Budget Alloué: ${data.budgetAmount.toLocaleString('fr-FR')} USD
      - Montant Dépensé: ${data.currentAmount.toLocaleString('fr-FR')} USD
      - Dépassement: ${(data.currentAmount - data.budgetAmount).toLocaleString('fr-FR')} USD
      - Pourcentage: ${Math.round((data.currentAmount / data.budgetAmount) * 100)}% du budget

      Action recommandée: Révisez les dépenses récentes.

      Système de Gestion de Production
      Alerte générée le ${new Date().toLocaleDateString('fr-FR')}
    `
  }),

  weeklyReport: (data: { userName: string; weekStart: string; weekEnd: string; stats: any }): EmailTemplate => ({
    subject: `📊 Rapport Hebdomadaire - Semaine du ${data.weekStart}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rapport Hebdomadaire</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #6f42c1, #563d7c);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .stat-box {
              background-color: #f8f9fa;
              border-radius: 5px;
              padding: 15px;
              text-align: center;
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #6f42c1;
            }
            .stat-label {
              font-size: 14px;
              color: #666;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Rapport Hebdomadaire</h1>
              <p>Semaine du ${data.weekStart} au ${data.weekEnd}</p>
            </div>
            <div class="content">
              <h2>Bonjour ${data.userName}!</h2>
              
              <p>Voici un résumé de l'activité de cette semaine:</p>
              
              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-number">${data.stats.production || 0}</div>
                  <div class="stat-label">Productions</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.stats.sales || 0}</div>
                  <div class="stat-label">Ventes</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.stats.costs || 0}$</div>
                  <div class="stat-label">Coûts</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${data.stats.inventory || 0}</div>
                  <div class="stat-label">Mouvements Stock</div>
                </div>
              </div>
              
              <p>Merci de votre engagement continu dans l'amélioration de nos opérations.</p>
            </div>
            <div class="footer">
              <p>Système de Gestion de Production</p>
              <p>Rapport automatique généré le ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      📊 RAPPORT HEBDOMADAIRE
      Semaine du ${data.weekStart} au ${data.weekEnd}

      Bonjour ${data.userName}!

      Résumé de l'activité:
      - Productions: ${data.stats.production || 0}
      - Ventes: ${data.stats.sales || 0}
      - Coûts: ${data.stats.costs || 0}$
      - Mouvements Stock: ${data.stats.inventory || 0}

      Merci de votre engagement continu.

      Système de Gestion de Production
      Rapport généré le ${new Date().toLocaleDateString('fr-FR')}
    `
  })
};

// Email Service Class
export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // In a real app, these would come from environment variables
    this.apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@conceptapp.com';
    this.fromName = process.env.FROM_NAME || 'Concept App - Gestion de Production';
  }

  // Send email using Resend (preferred) or fallback to SendGrid
  async sendEmail(template: EmailTemplate, options: EmailOptions): Promise<boolean> {
    try {
      // Try Resend first (if API key is available)
      if (process.env.RESEND_API_KEY) {
        return await this.sendWithResend(template, options);
      }
      
      // Fallback to SendGrid
      if (process.env.SENDGRID_API_KEY) {
        return await this.sendWithSendGrid(template, options);
      }
      
      // Development mode - log to console
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 EMAIL SIMULATION (Development Mode)');
        console.log('To:', options.to.map(r => r.email).join(', '));
        console.log('Subject:', template.subject);
        console.log('Content:', template.text || 'HTML content available');
        return true;
      }
      
      throw new Error('No email service configured');
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Resend implementation
  private async sendWithResend(template: EmailTemplate, options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: options.to.map(r => r.email),
          cc: options.cc?.map(r => r.email),
          bcc: options.bcc?.map(r => r.email),
          reply_to: options.replyTo,
          subject: template.subject,
          html: template.html,
          text: template.text,
          attachments: options.attachments
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Resend email error:', error);
      return false;
    }
  }

  // SendGrid implementation
  private async sendWithSendGrid(template: EmailTemplate, options: EmailOptions): Promise<boolean> {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(this.apiKey);

      const msg = {
        from: { email: this.fromEmail, name: this.fromName },
        personalizations: [{
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: template.subject
        }],
        content: [
          { type: 'text/html', value: template.html },
          { type: 'text/plain', value: template.text || '' }
        ],
        reply_to: options.replyTo ? { email: options.replyTo } : undefined,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          type: att.contentType,
          disposition: 'attachment'
        }))
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  // Convenience methods for common email types
  async sendUserInvitation(to: string, inviteeName: string, inviterName: string, companyName: string): Promise<boolean> {
    const template = emailTemplates.userInvitation({
      inviteeName,
      inviterName,
      companyName,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
    });

    return this.sendEmail(template, {
      to: [{ email: to, name: inviteeName }]
    });
  }

  async sendAccessRequestApproved(to: string, userName: string, companyName: string): Promise<boolean> {
    const template = emailTemplates.accessRequestApproved({
      userName,
      companyName,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
    });

    return this.sendEmail(template, {
      to: [{ email: to, name: userName }]
    });
  }

  async sendAccessRequestRejected(to: string, userName: string, companyName: string, reason?: string): Promise<boolean> {
    const template = emailTemplates.accessRequestRejected({
      userName,
      companyName,
      reason
    });

    return this.sendEmail(template, {
      to: [{ email: to, name: userName }]
    });
  }

  async sendLowStockAlert(to: string, adminName: string, productName: string, currentStock: number, threshold: number): Promise<boolean> {
    const template = emailTemplates.lowStockAlert({
      productName,
      currentStock,
      threshold,
      adminName
    });

    return this.sendEmail(template, {
      to: [{ email: to, name: adminName }]
    });
  }

  async sendBudgetOverrunAlert(to: string, adminName: string, expenseType: string, currentAmount: number, budgetAmount: number, period: string): Promise<boolean> {
    const template = emailTemplates.budgetOverrunAlert({
      expenseType,
      currentAmount,
      budgetAmount,
      adminName,
      period
    });

    return this.sendEmail(template, {
      to: [{ email: to, name: adminName }]
    });
  }

  async sendWeeklyReport(to: string, userName: string, weekStart: string, weekEnd: string, stats: any): Promise<boolean> {
    const template = emailTemplates.weeklyReport({
      userName,
      weekStart,
      weekEnd,
      stats
    });

    return this.sendEmail(template, {
      to: [{ email: to, name: userName }]
    });
  }
}

// Export singleton instance
export const emailService = new EmailService(); 