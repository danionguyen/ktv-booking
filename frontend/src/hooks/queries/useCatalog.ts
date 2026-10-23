import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { catalogApi, type AvailabilityQuery } from '@api/catalog'
import { qk } from '@api/keys'
import type { MenuCategory } from '@/types/domain'

export const useBranches = () => useQuery({ queryKey: qk.branches, queryFn: catalogApi.branches })

export const useBranch = (id: number | undefined) =>
  useQuery({ queryKey: qk.branch(id!), queryFn: () => catalogApi.branch(id!), enabled: !!id })

export const usePriceTable = (branchId: number | undefined) =>
  useQuery({
    queryKey: qk.priceTable(branchId!),
    queryFn: () => catalogApi.priceTable(branchId!),
    enabled: !!branchId,
  })

export const useRoomTypes = () =>
  useQuery({ queryKey: qk.roomTypes, queryFn: catalogApi.roomTypes })

export const useRoom = (id: number) =>
  useQuery({ queryKey: qk.room(id), queryFn: () => catalogApi.room(id) })

export const useRoomReviews = (id: number) =>
  useQuery({ queryKey: qk.roomReviews(id), queryFn: () => catalogApi.roomReviews(id) })

export const usePriceQuote = (roomId: number, start: string | undefined, hours: number) =>
  useQuery({
    queryKey: qk.priceQuote(roomId, start!, hours),
    queryFn: () => catalogApi.priceQuote(roomId, start!, hours),
    enabled: !!start,
    retry: false,
  })

export const useAvailability = (q: AvailabilityQuery | null) =>
  useQuery({
    queryKey: qk.availability(q ?? {}),
    queryFn: () => catalogApi.availability(q!),
    enabled: !!q,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 5_000,
  })

export const useRoomMap = (branchId: number | undefined, window?: { start: string; end: string }) =>
  useQuery({
    queryKey: qk.roomMap(branchId!, window?.start, window?.end),
    queryFn: () => catalogApi.roomMap(branchId!, window),
    enabled: !!branchId,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  })

export const useMenu = (params?: { category?: MenuCategory; available?: boolean }) =>
  useQuery({ queryKey: qk.menu(params), queryFn: () => catalogApi.menu(params), staleTime: 60_000 })
