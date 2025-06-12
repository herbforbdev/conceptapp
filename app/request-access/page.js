"use client";

import { useState } from 'react';
import { Card, Button, TextInput, Label, Textarea, Alert } from 'flowbite-react';
import { HiMail, HiUser, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';
import { userService } from '@/services/firestore/userService';
import { notificationService } from '@/services/firestore/notificationService';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      if (!formData.email || !formData.displayName) {
        setResult({
          type: 'error',
          message: 'Veuillez remplir tous les champs obligatoires.'
        });
        return;
      }

      // Check if user already exists
      const { user: existingUser } = await userService.isUserAuthorized(formData.email);
      
      if (existingUser) {
        setResult({
          type: 'info',
          message: 'Un compte avec cette adresse email existe déjà. Veuillez contacter un administrateur si vous avez des problèmes d&apos;accès.'
        });
        setLoading(false);
        return;
      }

      // Create access request
      const requestId = await userService.createAccessRequest(
        formData.email,
        formData.displayName,
        formData.message
      );

      if (!requestId) {
        throw new Error('Failed to create access request');
      }

      // Get all admin users to notify
      const allUsers = await userService.getAllUsers();
      const adminIds = allUsers
        .filter(user => user.role === 'admin')
        .map(user => user.id);

      // Notify admins of new access request
      if (adminIds.length > 0) {
        await notificationService.notifyAdminsOfAccessRequest(
          formData.email,
          formData.displayName,
          adminIds
        );
      } else {
        console.warn('No admin users found to notify');
      }

      setResult({
        type: 'success',
        message: 'Votre demande d&apos;accès a été envoyée avec succès! Un administrateur examinera votre demande et vous contactera bientôt.'
      });

      // Reset form
      setFormData({
        email: '',
        displayName: '',
        message: ''
      });
    } catch (error) {
      console.error('Error creating access request:', error);
      setResult({
        type: 'error',
        message: 'Une erreur est survenue lors de l&apos;envoi de votre demande. Veuillez réessayer plus tard ou contacter le support.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Demander l&apos;accès
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Remplissez ce formulaire pour demander l&apos;accès à l&apos;application
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" value="Adresse email *" />
                <div className="relative">
                  <TextInput
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    icon={HiMail}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="displayName" value="Nom complet *" />
                <div className="relative">
                  <TextInput
                    id="displayName"
                    name="displayName"
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="Votre nom complet"
                    icon={HiUser}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message" value="Message (optionnel)" />
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Expliquez brièvement pourquoi vous avez besoin d&apos;accéder à cette application..."
                  rows={4}
                />
              </div>

              {result && (
                <Alert
                  color={result.type === 'success' ? 'success' : result.type === 'error' ? 'failure' : 'info'}
                  icon={result.type === 'success' ? HiCheckCircle : HiExclamationCircle}
                >
                  <span className="font-medium">{result.message}</span>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Vous avez déjà un compte?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Se connecter
                </Link>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 