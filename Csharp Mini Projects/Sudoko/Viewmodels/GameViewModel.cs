﻿using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Documents;
using System.Windows.Media;
using Sudoko.Annotations;

namespace Sudoko.Viewmodels
{
    public class GameViewModel : INotifyPropertyChanged
    {
        public GameViewModel()
        {
            SolveTime = "00:00:000";
            SolveEnabled = true;
            GameList = new ObservableCollection<ObservableCollection<int>>();

            PresetGame();
        }

        public void PresetGame()
        {
            for (int i = 0; i < 9; i++)
            {
                GameList.Add(new ObservableCollection<int>());
                for (int j = 0; j < 9; j++)
                {
                    GameList[i].Add(0);
                }
            }
            GameList[0][1] = 6;
            GameList[0][3] = 5;
            GameList[0][4] = 3;
            GameList[0][5] = 7;
            GameList[0][7] = 4;

            GameList[1][0] = 3;
            GameList[1][4] = 9;
            GameList[1][8] = 6;

            GameList[2][0] = 8;
            GameList[2][2] = 4;
            GameList[2][6] = 3;
            GameList[2][8] = 7;

            GameList[3][1] = 9;
            GameList[3][6] = 7;
            GameList[3][7] = 1;
            GameList[3][8] = 3;

            GameList[4][1] = 5;
            GameList[4][2] = 1;
            GameList[4][6] = 6;
            GameList[4][7] = 2;

            GameList[5][0] = 2;
            GameList[5][1] = 3;
            GameList[5][2] = 8;
            GameList[5][7] = 4;

            GameList[6][0] = 3;
            GameList[6][2] = 6;
            GameList[6][6] = 1;
            GameList[6][8] = 2;

            GameList[7][0] = 4;
            GameList[7][4] = 6;
            GameList[7][8] = 9;

            GameList[8][1] = 1;
            GameList[8][3] = 5;
            GameList[8][4] = 2;
            GameList[8][5] = 3;
            GameList[8][7] = 8;
        }
        #region Databindings

        /// <summary>
        /// The game array is created in the following form
        /// [0,0 0,1 0,2] [1,0 1,1 1,2] [2,0 2,1 2,2] 
        /// [0,3 0,4 0,5] [1,3 1,4 1,5] [2,3 2,4 2,5] 
        /// [0,6 0,7 0,8] [1,6 1,7 1,8] [2,6 2,7 2,8] 
        /// 
        /// [3,0 3,1 3,2] [4,0 4,1 4,2] [5,0 5,1 5,2] 
        /// [3,3 3,4 3,5] [4,3 4,4 4,5] [5,3 5,4 5,5] 
        /// [3,6 3,7 3,8] [4,6 4,7 4,8] [5,6 5,7 5,8] 
        /// 
        /// [6,0 6,1 6,2] [7,0 7,1 7,2] [8,0 8,1 8,2] 
        /// [6,3 6,4 6,5] [7,3 7,4 7,5] [8,3 8,4 8,5] 
        /// [6,6 6,7 6,8] [7,6 7,7 7,8] [8,6 8,7 8,8] 
        /// </summary>
        public ObservableCollection<ObservableCollection<int>> GameList { get; set; }

        private string _solveTime;
        public string SolveTime
        {
            get { return _solveTime; }
            set
            {
                _solveTime = value;
                NotifyPropertyChanged("SolveTime");
            }
        }

        private bool _solveEnabled;
        public bool SolveEnabled
        {
            get { return _solveEnabled; }
            set
            {
                _solveEnabled = value;
                NotifyPropertyChanged("SolveEnabled");
            }
        }
        #endregion Databindings
        #region Actions

        /// <summary>
        /// This method gets called by the solve button.
        /// </summary>
        public async void Solve()
        {
            SolveEnabled = false;
            SolveTime = "00:00:000";

            Stopwatch sw = Stopwatch.StartNew();

            await Task.Run(() => SolvePuzzle());

            sw.Stop();
            SolveTime = sw.Elapsed + "";
            SolveEnabled = true;
        }

        /// <summary>
        /// This method holds the starting point of the algorithm to solve the sudoku
        /// </summary>
        private void SolvePuzzle()
        {
            bool changed = true;
            while (GameList.Select(ints => ints).Any(ints => ints.Contains(0)) && changed)
            {
                changed = false;
                for (int index = 0; index < GameList.Count; index++)
                {
                    var box = GameList[index];
                    for (int i = 0; i < box.Count; i++)
                    {
                        int spot = box[i];
                        if (spot == 0)
                        {
                            List<int> validNumbers = new List<int>();
                            for (int j = 1; j <= 9; j++)
                            {
                                if (CheckValidity(j, index, i))
                                {
                                    validNumbers.Add(j);
                                }
                            }
                            if (validNumbers.Count == 1)
                            {
                                box[i] = validNumbers[0];
                                changed = true;
                            }
                        }
                    }
                }
            }
            
        }

        private bool CheckValidity(int number, int boxIndex, int spotIndex)
        {
            return IsNotInOwnBox(number, boxIndex) && IsNotInColoumn(number, boxIndex, spotIndex) && IsNotInRow(number, boxIndex, spotIndex);
        }

        private bool IsNotInRow(int number, int boxIndex, int spotIndex)
        {
            foreach (var spot in GetRow(boxIndex,spotIndex))
            {
                if (spot == number) return false;
            }
            return true;
        }

        private bool IsNotInColoumn(int number, int boxIndex, int spotIndex)
        {
            foreach (var spot in GetColoumn(boxIndex, spotIndex))
            {
                if (spot == number) return false;
            }
            return true;
        }

        private bool IsNotInOwnBox(int number, int boxIndex)
        {
            foreach (var spot in GameList[boxIndex])
            {
                if (spot == number) return false;
            }
            return true;
        }
        private List<int> GetRow(int boxIndex, int spotIndex)
        {
            int firstBox = boxIndex-(boxIndex % 3);
            int firstSpot = spotIndex-(spotIndex % 3);
            var list = new List<int>();
            for (int i = firstBox; i < firstBox+3; i++)
            {
                for (int j = firstSpot; j < firstSpot+3; j++)
                {
                    if (GameList[i][j] != 0)
                    {
                        list.Add(GameList[i][j]);
                    }
                }
            }
            return list;
        }
        private List<int> GetColoumn(int boxIndex, int spotIndex)
        {
            int firstBox = boxIndex%3;
            int firstSpot = spotIndex%3;
            var list = new List<int>();
            for (int i = firstBox; i < GameList.Count; i += 3)
            {
                for (int j = firstSpot; j < GameList[i].Count; j += 3)
                {
                    if (GameList[i][j] != 0)
                    {
                        list.Add(GameList[i][j]);
                    }
                }
            }
            return list;
        }

        #endregion

        #region INotifyPropertyChanged
        public event PropertyChangedEventHandler PropertyChanged;

        /// <summary>
        /// A method for notifying the view if any properties have been changed.
        /// <param name="info">The name of the property which has changed</param>
        /// </summary>
        private void NotifyPropertyChanged(String info)
        {
            if (PropertyChanged != null)
            {
                PropertyChanged(this, new PropertyChangedEventArgs(info));
            }
        }
        #endregion
    }
}
