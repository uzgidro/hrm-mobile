import React from 'react';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/api/client';
import { renderWithProviders } from '@/test/renderWithProviders';
import { VehicleSection } from '../components/VehicleSection';
import type { Letter, User } from '@/types';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

// Avtopark bloki. Asosiy shart (foydalanuvchi qarori 2026-08-12): xodim
// MASHINANI TANLAMAYDI — u faqat "mashina kerak" deydi; mashinani BFD
// transport mas'uli biriktiradi va shu payt haydovchiga safar ochiladi.
describe('VehicleSection', () => {
  const mock = new MockAdapter(apiClient);
  afterEach(() => mock.reset());

  const owner = { employee: { id: 5 } } as unknown as User;
  const tripBase: Letter = {
    id: 1,
    letter_type: 'business_trip',
    status: 'pending',
    organization_branch_id: 1,
    creator_employee_id: 5,
  } as Letter;

  function mockAccess() {
    mock.onGet(new RegExp('vehicles/access')).reply(200, {
      can_manage: false, can_request: true, provider_branch_id: 29, requester_branch_ids: [1, 29],
    });
  }

  it('bildirgi/arizada umuman chizilmaydi (faqat xizmat safari)', async () => {
    mockAccess();
    const { queryByText } = await renderWithProviders(
      <VehicleSection letter={{ ...tripBase, letter_type: 'explanatory' }} user={owner} onChanged={jest.fn()} />,
    );
    expect(queryByText('Transport')).toBeNull();
  }, 15000);

  it("mashinasiz safarda egasiga \"Mashina so'rash\" tugmasini ko'rsatadi", async () => {
    mockAccess();
    const { findByText } = await renderWithProviders(
      <VehicleSection letter={tripBase} user={owner} onChanged={jest.fn()} />,
    );
    expect(await findByText("Mashina so'rash")).toBeTruthy();
  }, 15000);

  it("so'rov yuborilgan, mashina hali biriktirilmagan holatni ko'rsatadi", async () => {
    mockAccess();
    const letter = {
      ...tripBase,
      vehicle_request: { id: 7, status: 'pending', vehicle: null, vehicle_id: null },
    } as unknown as Letter;
    const { findByText } = await renderWithProviders(
      <VehicleSection letter={letter} user={owner} onChanged={jest.fn()} />,
    );
    expect(await findByText("Mashina so'ralgan")).toBeTruthy();
    expect(await findByText('BFD javobi kutilmoqda')).toBeTruthy();
  }, 15000);

  it("BFD mas'uliga biriktirish/rad etish tugmalari chiqadi (can_respond)", async () => {
    mockAccess();
    const letter = {
      ...tripBase,
      vehicle_request: { id: 7, status: 'pending', vehicle: null, can_respond: true },
    } as unknown as Letter;
    const { findByText } = await renderWithProviders(
      <VehicleSection letter={letter} user={{ employee: { id: 99 } } as unknown as User} onChanged={jest.fn()} />,
    );
    expect(await findByText('Mashina biriktirish')).toBeTruthy();
    expect(await findByText('Rad etish')).toBeTruthy();
  }, 15000);

  it('biriktirilgach mashina, haydovchi va haydovchi safarini ko\'rsatadi', async () => {
    mockAccess();
    const letter = {
      ...tripBase,
      vehicle_request: {
        id: 7, status: 'approved',
        vehicle: { id: 3, plate_number: '01A123BC', model_name: 'Malibu' },
        assigned_driver: { id: 11, legal_name: 'Haydovchi Aka' },
        driver_letter_id: 55, driver_letter_number: '29-1',
      },
    } as unknown as Letter;
    const { findByText } = await renderWithProviders(
      <VehicleSection letter={letter} user={owner} onChanged={jest.fn()} />,
    );
    expect(await findByText('01A123BC — Malibu')).toBeTruthy();
    expect(await findByText('Haydovchi Aka')).toBeTruthy();
    expect(await findByText(/Haydovchiga xizmat safari ochildi/)).toBeTruthy();
  }, 15000);
});
