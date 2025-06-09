'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Label, TextInput, Select, Alert, Badge, Tabs } from 'flowbite-react';
import { 
  HiShieldCheck, HiEye, HiDownload, HiSearch, HiFilter, HiRefresh, 
  HiInformationCircle, HiClock, HiUser,
  HiDatabase, HiLockClosed, HiChartBar, HiDocumentReport
} from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { auditService } from '@/services/auditService';

export default function AuditDashboardPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resource: '',
    category: '',
    severity: '',
    outcome: '',
    startDate: '',
    endDate: '',
    searchTerm: '',
    limit: 50
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Check admin access
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAuditLogs();
      loadStatistics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const searchFilters = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined
      };

      // Remove empty filters
      Object.keys(searchFilters).forEach(key => {
        if (!searchFilters[key]) delete searchFilters[key];
      });

      const result = filters.searchTerm 
        ? await auditService.searchAuditLogs(filters.searchTerm, searchFilters)
        : await auditService.getAuditLogs(searchFilters);

      if (Array.isArray(result)) {
        setLogs(result);
        setHasMore(false);
      } else {
        setLogs(result.logs || []);
        setHasMore(result.hasMore || false);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30); // Last 30 days

      const stats = await auditService.getAuditStatistics(startDate, endDate);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      userId: '',
      action: '',
      resource: '',
      category: '',
      severity: '',
      outcome: '',
      startDate: '',
      endDate: '',
      searchTerm: '',
      limit: 50
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const searchFilters = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        limit: 10000 // Large limit for export
      };

      Object.keys(searchFilters).forEach(key => {
        if (!searchFilters[key]) delete searchFilters[key];
      });

      const csvContent = await auditService.exportAuditLogs(searchFilters);
      
      // Download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    } finally {
      setExporting(false);
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

  const getOutcomeBadgeColor = (outcome) => {
    switch (outcome) {
      case 'success': return 'success';
      case 'failure': return 'failure';
      case 'partial': return 'warning';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'authentication': return <HiLockClosed className="h-4 w-4" />;
      case 'authorization': return <HiShieldCheck className="h-4 w-4" />;
      case 'data_access': return <HiEye className="h-4 w-4" />;
      case 'data_modification': return <HiDatabase className="h-4 w-4" />;
      case 'security': return <HiShieldCheck className="h-4 w-4" />;
      case 'system_administration': return <HiUser className="h-4 w-4" />;
      default: return <HiInformationCircle className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('fr-FR');
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert color="failure">
          <HiShieldCheck className="h-4 w-4" />
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <HiShieldCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Journal d&apos;Audit</h1>
              <p className="text-gray-600">Surveillance et conformité du système</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadAuditLogs} disabled={loading}>
              <HiRefresh className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={handleExport} disabled={exporting} color="blue">
              <HiDownload className="h-4 w-4 mr-2" />
              {exporting ? 'Export...' : 'Exporter'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs>
        {/* Audit Logs Tab */}
        <Tabs.Item 
          title={
            <span className="flex items-center gap-2">
              <HiDocumentReport className="h-4 w-4" />
              Journaux d&apos;Audit
            </span>
          }
        >
          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" value="Recherche" />
                <TextInput
                  id="search"
                  type="text"
                  placeholder="Email, action, description..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  icon={HiSearch}
                />
              </div>
              
              <div>
                <Label htmlFor="action" value="Action" />
                <Select
                  id="action"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">Toutes les actions</option>
                  <option value="login">Connexion</option>
                  <option value="logout">Déconnexion</option>
                  <option value="login_failed">Échec connexion</option>
                  <option value="user_created">Utilisateur créé</option>
                  <option value="user_updated">Utilisateur modifié</option>
                  <option value="record_created">Enregistrement créé</option>
                  <option value="record_updated">Enregistrement modifié</option>
                  <option value="record_deleted">Enregistrement supprimé</option>
                  <option value="data_export">Export de données</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity" value="Gravité" />
                <Select
                  id="severity"
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <option value="">Toutes les gravités</option>
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Élevée</option>
                  <option value="critical">Critique</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="outcome" value="Résultat" />
                <Select
                  id="outcome"
                  value={filters.outcome}
                  onChange={(e) => handleFilterChange('outcome', e.target.value)}
                >
                  <option value="">Tous les résultats</option>
                  <option value="success">Succès</option>
                  <option value="failure">Échec</option>
                  <option value="partial">Partiel</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="startDate" value="Date de début" />
                <TextInput
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate" value="Date de fin" />
                <TextInput
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  <HiFilter className="h-4 w-4 mr-2" />
                  Appliquer
                </Button>
                <Button color="gray" onClick={clearFilters}>
                  Effacer
                </Button>
              </div>
            </div>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Horodatage</Table.HeadCell>
                  <Table.HeadCell>Utilisateur</Table.HeadCell>
                  <Table.HeadCell>Action</Table.HeadCell>
                  <Table.HeadCell>Ressource</Table.HeadCell>
                  <Table.HeadCell>Gravité</Table.HeadCell>
                  <Table.HeadCell>Résultat</Table.HeadCell>
                  <Table.HeadCell>Description</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Chargement...
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ) : logs.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={8} className="text-center py-8 text-gray-500">
                        Aucun journal d&apos;audit trouvé
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    logs.map((log) => (
                      <Table.Row key={log.id} className="bg-white">
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <HiClock className="h-4 w-4 text-gray-400" />
                            <div className="text-sm">
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div>
                            <div className="font-medium text-gray-900">{log.userName || 'Inconnu'}</div>
                            <div className="text-sm text-gray-500">{log.userEmail}</div>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(log.category)}
                            <span className="text-sm font-medium">{log.action}</span>
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div>
                            <div className="font-medium">{log.resource}</div>
                            {log.resourceId && (
                              <div className="text-xs text-gray-500">{log.resourceId.substring(0, 8)}...</div>
                            )}
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <Badge color={getSeverityBadgeColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <Badge color={getOutcomeBadgeColor(log.outcome)}>
                            {log.outcome}
                          </Badge>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <div className="max-w-xs truncate" title={log.details?.description}>
                            {log.details?.description || 'Aucune description'}
                          </div>
                        </Table.Cell>
                        
                        <Table.Cell>
                          <Button
                            size="xs"
                            color="blue"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailsModal(true);
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

            {hasMore && (
              <div className="p-4 text-center">
                <Button onClick={() => {
                  setFilters(prev => ({ ...prev, limit: prev.limit + 50 }));
                  loadAuditLogs();
                }}>
                  Charger plus d&apos;entrées
                </Button>
              </div>
            )}
          </Card>
        </Tabs.Item>

        {/* Statistics Tab */}
        <Tabs.Item 
          title={
            <span className="flex items-center gap-2">
              <HiChartBar className="h-4 w-4" />
              Statistiques
            </span>
          }
        >
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.totalEvents}</div>
                  <div className="text-sm text-gray-600">Événements Total</div>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{statistics.securityEvents}</div>
                  <div className="text-sm text-gray-600">Événements Sécurité</div>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{statistics.failedLogins}</div>
                  <div className="text-sm text-gray-600">Connexions Échouées</div>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((statistics.eventsByOutcome.success || 0) / statistics.totalEvents * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Taux de Succès</div>
                </div>
              </Card>
            </div>
          )}

          {/* Additional statistics cards would go here */}
        </Tabs.Item>
      </Tabs>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onClose={() => setShowDetailsModal(false)} size="xl">
                    <Modal.Header>Détails de l&apos;Événement d&apos;Audit</Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Horodatage</Label>
                  <p className="text-sm text-gray-600">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <Label className="font-medium">ID de Session</Label>
                  <p className="text-sm text-gray-600">{selectedLog.sessionId || 'Non disponible'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Utilisateur</Label>
                  <p className="text-sm text-gray-600">{selectedLog.userName} ({selectedLog.userEmail})</p>
                </div>
                <div>
                  <Label className="font-medium">Adresse IP</Label>
                  <p className="text-sm text-gray-600">{selectedLog.ipAddress || 'Non disponible'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-medium">Action</Label>
                  <p className="text-sm text-gray-600">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="font-medium">Ressource</Label>
                  <p className="text-sm text-gray-600">{selectedLog.resource}</p>
                </div>
                <div>
                  <Label className="font-medium">ID Ressource</Label>
                  <p className="text-sm text-gray-600">{selectedLog.resourceId || 'Non applicable'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="font-medium">Catégorie</Label>
                  <p className="text-sm text-gray-600">{selectedLog.category}</p>
                </div>
                <div>
                  <Label className="font-medium">Gravité</Label>
                  <Badge color={getSeverityBadgeColor(selectedLog.severity)}>
                    {selectedLog.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Résultat</Label>
                  <Badge color={getOutcomeBadgeColor(selectedLog.outcome)}>
                    {selectedLog.outcome}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="font-medium">Description</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedLog.details?.description || 'Aucune description'}
                </p>
              </div>

              {selectedLog.changes && (
                <div>
                  <Label className="font-medium">Modifications</Label>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <Label className="font-medium">Agent Utilisateur</Label>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {selectedLog.userAgent}
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