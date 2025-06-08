'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Label, TextInput, Alert, Badge, Tabs, ToggleSwitch } from 'flowbite-react';
import { 
  HiShieldCheck, HiLockClosed, HiEye, HiRefresh,
  HiClock, HiGlobe, HiUser, HiKey, HiCog, HiBan, HiCheckCircle
} from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/auditService';
import { permissionService } from '@/services/permissionService';

export default function SecurityDashboardPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [securityStats, setSecurityStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    failedLoginAttempts: 0,
    suspiciousActivities: 0,
    activeSessionsCount: 0,
    uniqueIPsToday: 0
  });
  const [securitySettings, setSecuritySettings] = useState({
    maxFailedLogins: 5,
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireSpecialChars: true,
    enableTwoFactor: false,
    enableIPWhitelist: false,
    enableRateLimit: true,
    auditLogRetention: 90
  });
  const [threatDetection, setThreatDetection] = useState({
    bruteForceDetection: true,
    suspiciousLocationDetection: true,
    multipleSessionDetection: true,
    privilegeEscalationDetection: true
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // Check admin access
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadSecurityData();
    }
  }, [isAdmin]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load security events from last 24 hours
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 1);

      const securityEventsResult = await auditService.getAuditLogs({
        category: 'security',
        startDate,
        endDate,
        limit: 100
      });

      setSecurityEvents(securityEventsResult.logs || []);

      // Calculate security statistics
      await calculateSecurityStats(startDate, endDate);

      // Load active sessions (mock data for now)
      setActiveSessions([
        {
          id: '1',
          userId: 'user1',
          userEmail: 'admin@example.com',
          ipAddress: '192.168.1.100',
          location: 'Kinshasa, CD',
          userAgent: 'Chrome 120.0.0.0',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 5 * 60 * 1000),
          isActive: true
        },
        {
          id: '2',
          userId: 'user2',
          userEmail: 'manager@example.com',
          ipAddress: '192.168.1.101',
          location: 'Kinshasa, CD',
          userAgent: 'Firefox 121.0.0.0',
          startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 10 * 60 * 1000),
          isActive: true
        }
      ]);

    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSecurityStats = async (startDate, endDate) => {
    try {
      const stats = await auditService.getAuditStatistics(startDate, endDate);
      
      setSecurityStats({
        totalEvents: stats.securityEvents || 0,
        criticalEvents: stats.eventsBySeverity?.critical || 0,
        failedLoginAttempts: stats.failedLogins || 0,
        suspiciousActivities: (stats.eventsByAction?.suspicious_activity || 0) + 
                            (stats.eventsByAction?.access_denied || 0),
        activeSessionsCount: activeSessions.length,
        uniqueIPsToday: new Set(securityEvents.map(e => e.ipAddress).filter(ip => ip)).size
      });
    } catch (error) {
      console.error('Error calculating security stats:', error);
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'failure';
      case 'critical': return 'purple';
      default: return 'gray';
    }
  };

  const getEventTypeIcon = (action) => {
    switch (action) {
      case 'login_failed': return <HiBan className="h-4 w-4 text-red-600" />;
      case 'access_denied': return <HiLockClosed className="h-4 w-4 text-orange-600" />;
      case 'suspicious_activity': return <HiBan className="h-4 w-4 text-red-600" />;
      case 'account_locked': return <HiBan className="h-4 w-4 text-red-600" />;
      default: return <HiShieldCheck className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('fr-FR');
  };

  const handleSecuritySettingChange = (setting, value) => {
    setSecuritySettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleThreatDetectionChange = (setting, value) => {
    setThreatDetection(prev => ({ ...prev, [setting]: value }));
  };

  const saveSecuritySettings = async () => {
    try {
      // In a real implementation, save to database
      console.log('Saving security settings:', securitySettings);
      
      // Log security configuration change
      await auditService.logAdminAction(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName || currentUser.email,
        'system_config_changed',
        'system',
        'Security settings updated',
        'high',
        { settings: securitySettings }
      );
      
      alert('Paramètres de sécurité sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving security settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      // Remove session from active sessions
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // Log session termination
      await auditService.logAdminAction(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName || currentUser.email,
        'user_updated',
        'session',
        `Terminated session ${sessionId}`,
        'medium',
        { sessionId }
      );
      
      alert('Session terminée avec succès');
    } catch (error) {
      console.error('Error terminating session:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert color="failure">
          <HiBan className="h-4 w-4" />
          <span className="ml-2">Accès refusé. Cette page est réservée aux administrateurs.</span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <HiShieldCheck className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Sécurité</h1>
              <p className="text-gray-600">Surveillance et gestion de la sécurité du système</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadSecurityData} disabled={loading}>
              <HiRefresh className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{securityStats.totalEvents}</div>
            <div className="text-sm text-gray-600">Événements Sécurité</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{securityStats.criticalEvents}</div>
            <div className="text-sm text-gray-600">Événements Critiques</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{securityStats.failedLoginAttempts}</div>
            <div className="text-sm text-gray-600">Connexions Échouées</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{securityStats.suspiciousActivities}</div>
            <div className="text-sm text-gray-600">Activités Suspectes</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{securityStats.activeSessionsCount}</div>
            <div className="text-sm text-gray-600">Sessions Actives</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{securityStats.uniqueIPsToday}</div>
            <div className="text-sm text-gray-600">IPs Uniques</div>
          </div>
        </Card>
      </div>

      <Tabs>
        {/* Security Events Tab */}
        <Tabs.Item 
          title={
            <span className="flex items-center gap-2">
              <HiBan className="h-4 w-4" />
              Événements de Sécurité
            </span>
          }
        >
          <Card>
            <div className="overflow-x-auto">
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Horodatage</Table.HeadCell>
                  <Table.HeadCell>Type</Table.HeadCell>
                  <Table.HeadCell>Utilisateur</Table.HeadCell>
                  <Table.HeadCell>Adresse IP</Table.HeadCell>
                  <Table.HeadCell>Gravité</Table.HeadCell>
                  <Table.HeadCell>Description</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Chargement...
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ) : securityEvents.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={7} className="text-center py-8 text-gray-500">
                        Aucun événement de sécurité récent
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    securityEvents.map((event) => (
                      <Table.Row key={event.id} className="bg-white">
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <HiClock className="h-4 w-4 text-gray-400" />
                            <div className="text-sm">
                              {formatTimestamp(event.timestamp)}
                            </div>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            {getEventTypeIcon(event.action)}
                            <span className="text-sm font-medium">{event.action}</span>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div>
                            <div className="font-medium text-gray-900">{event.userName || 'Inconnu'}</div>
                            <div className="text-sm text-gray-500">{event.userEmail}</div>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <HiGlobe className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{event.ipAddress || 'Non disponible'}</span>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <Badge color={getSeverityBadgeColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div className="max-w-xs truncate" title={event.details?.description}>
                            {event.details?.description || 'Aucune description'}
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <Button
                            size="xs"
                            color="blue"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowEventModal(true);
                            }}
                          >
                            <HiEye className="h-3 w-3" />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            </div>
          </Card>
        </Tabs.Item>

        {/* Active Sessions Tab */}
        <Tabs.Item 
          title={
            <span className="flex items-center gap-2">
              <HiUser className="h-4 w-4" />
              Sessions Actives
            </span>
          }
        >
          <Card>
            <div className="overflow-x-auto">
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Utilisateur</Table.HeadCell>
                  <Table.HeadCell>Adresse IP</Table.HeadCell>
                  <Table.HeadCell>Localisation</Table.HeadCell>
                  <Table.HeadCell>Navigateur</Table.HeadCell>
                  <Table.HeadCell>Début Session</Table.HeadCell>
                  <Table.HeadCell>Dernière Activité</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {activeSessions.map((session) => (
                    <Table.Row key={session.id} className="bg-white">
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <HiCheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{session.userEmail}</div>
                            <div className="text-sm text-gray-500">ID: {session.userId}</div>
                          </div>
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <HiGlobe className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{session.ipAddress}</span>
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell>{session.location}</Table.Cell>
                      <Table.Cell>{session.userAgent}</Table.Cell>
                      <Table.Cell>{session.startTime.toLocaleString('fr-FR')}</Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-sm">{session.lastActivity.toLocaleString('fr-FR')}</span>
                        </div>
                      </Table.Cell>
                      
                      <Table.Cell>
                        <Button
                          size="xs"
                          color="failure"
                          onClick={() => terminateSession(session.id)}
                        >
                          Terminer
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </Card>
        </Tabs.Item>

        {/* Security Settings Tab */}
        <Tabs.Item 
          title={
            <span className="flex items-center gap-2">
              <HiCog className="h-4 w-4" />
              Paramètres Sécurité
            </span>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Authentication Settings */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres d'Authentification</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="maxFailedLogins" value="Tentatives de connexion max" />
                  <TextInput
                    id="maxFailedLogins"
                    type="number"
                    value={securitySettings.maxFailedLogins}
                    onChange={(e) => handleSecuritySettingChange('maxFailedLogins', parseInt(e.target.value))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sessionTimeout" value="Timeout de session (minutes)" />
                  <TextInput
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="passwordMinLength" value="Longueur minimale du mot de passe" />
                  <TextInput
                    id="passwordMinLength"
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => handleSecuritySettingChange('passwordMinLength', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="requireSpecialChars" value="Exiger des caractères spéciaux" />
                  <ToggleSwitch
                    id="requireSpecialChars"
                    checked={securitySettings.requireSpecialChars}
                    onChange={(checked) => handleSecuritySettingChange('requireSpecialChars', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableTwoFactor" value="Authentification à deux facteurs" />
                  <ToggleSwitch
                    id="enableTwoFactor"
                    checked={securitySettings.enableTwoFactor}
                    onChange={(checked) => handleSecuritySettingChange('enableTwoFactor', checked)}
                  />
                </div>
              </div>
            </Card>

            {/* Security Features */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fonctionnalités de Sécurité</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableIPWhitelist" value="Liste blanche IP" />
                  <ToggleSwitch
                    id="enableIPWhitelist"
                    checked={securitySettings.enableIPWhitelist}
                    onChange={(checked) => handleSecuritySettingChange('enableIPWhitelist', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableRateLimit" value="Limitation du taux de requêtes" />
                  <ToggleSwitch
                    id="enableRateLimit"
                    checked={securitySettings.enableRateLimit}
                    onChange={(checked) => handleSecuritySettingChange('enableRateLimit', checked)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="auditLogRetention" value="Rétention des logs d'audit (jours)" />
                  <TextInput
                    id="auditLogRetention"
                    type="number"
                    value={securitySettings.auditLogRetention}
                    onChange={(e) => handleSecuritySettingChange('auditLogRetention', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </Card>

            {/* Threat Detection */}
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détection des Menaces</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bruteForceDetection" value="Détection force brute" />
                  <ToggleSwitch
                    id="bruteForceDetection"
                    checked={threatDetection.bruteForceDetection}
                    onChange={(checked) => handleThreatDetectionChange('bruteForceDetection', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="suspiciousLocationDetection" value="Détection localisation suspecte" />
                  <ToggleSwitch
                    id="suspiciousLocationDetection"
                    checked={threatDetection.suspiciousLocationDetection}
                    onChange={(checked) => handleThreatDetectionChange('suspiciousLocationDetection', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="multipleSessionDetection" value="Détection sessions multiples" />
                  <ToggleSwitch
                    id="multipleSessionDetection"
                    checked={threatDetection.multipleSessionDetection}
                    onChange={(checked) => handleThreatDetectionChange('multipleSessionDetection', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="privilegeEscalationDetection" value="Détection élévation privilèges" />
                  <ToggleSwitch
                    id="privilegeEscalationDetection"
                    checked={threatDetection.privilegeEscalationDetection}
                    onChange={(checked) => handleThreatDetectionChange('privilegeEscalationDetection', checked)}
                  />
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="lg:col-span-2">
              <Card>
                <div className="text-center">
                  <Button onClick={saveSecuritySettings} size="lg">
                    <HiKey className="h-4 w-4 mr-2" />
                    Sauvegarder les Paramètres de Sécurité
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </Tabs.Item>
      </Tabs>

      {/* Event Details Modal */}
      <Modal show={showEventModal} onClose={() => setShowEventModal(false)} size="xl">
        <Modal.Header>Détails de l'Événement de Sécurité</Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Horodatage</Label>
                  <p className="text-sm text-gray-600">{formatTimestamp(selectedEvent.timestamp)}</p>
                </div>
                <div>
                  <Label className="font-medium">Type d'Événement</Label>
                  <p className="text-sm text-gray-600">{selectedEvent.action}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Utilisateur</Label>
                  <p className="text-sm text-gray-600">{selectedEvent.userName} ({selectedEvent.userEmail})</p>
                </div>
                <div>
                  <Label className="font-medium">Adresse IP</Label>
                  <p className="text-sm text-gray-600">{selectedEvent.ipAddress || 'Non disponible'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Gravité</Label>
                  <Badge color={getSeverityBadgeColor(selectedEvent.severity)}>
                    {selectedEvent.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Résultat</Label>
                  <Badge color={selectedEvent.outcome === 'success' ? 'success' : 'failure'}>
                    {selectedEvent.outcome}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="font-medium">Description</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedEvent.details?.description || 'Aucune description'}
                </p>
              </div>

              {selectedEvent.userAgent && (
                <div>
                  <Label className="font-medium">Agent Utilisateur</Label>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {selectedEvent.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
} 
